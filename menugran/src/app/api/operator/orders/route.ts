import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const session = await withAuth({ requiredRole: ["EMPLOYEE", "ADMIN", "SUPER_ADMIN"] });
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        restaurant: {
          select: { id: true, name: true },
        },
        table: {
          select: { number: true },
        },
        items: {
          include: {
            menuItem: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = orders.map((order) => {
      const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
      return {
        id: order.id,
        number: `#${order.id.slice(-4).toUpperCase()}`,
        serviceType: order.serviceType,
        tableNumber: order.table?.number ?? null,
        status: order.status,
        paymentMethod: order.paymentMethod,
        clientName: order.client.name || "Sin nombre",
        clientPhone: order.client.phone || "Sin teléfono",
        address: order.deliveryAddress || (order.table ? `Mesa ${order.table.number}` : "Mesa"),
        items: itemCount,
        total: order.totalPrice,
        restaurantName: order.restaurant.name,
        notes: order.notes,
        createdAt: order.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("[OPERATOR_ORDERS_GET]", error);
    return NextResponse.json({ error: "Error al cargar pedidos" }, { status: 500 });
  }
}
