import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";
import { OrderStatus } from "@prisma/client";

type Role = "CLIENT" | "ADMIN" | "OPERATOR" | "RIDER" | "SUPERADMIN";

const isPrivileged = (role: string) =>
  role === "ADMIN" || role === "OPERATOR" || role === "SUPERADMIN";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await withAuth();
  if (session instanceof NextResponse) return session;

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        restaurant: {
          select: { id: true, name: true, address: true, lat: true, lng: true },
        },
        table: {
          select: { number: true },
        },
        rider: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            menuItem: {
              select: { name: true, price: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    // IDOR fix: clients can only see their own orders
    const role = session.user.role as Role;
    if (!isPrivileged(role) && role !== "RIDER") {
      if (order.clientId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }

    // Riders can only see orders assigned to them
    if (role === "RIDER" && order.riderId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const data = {
      ...order,
      tableNumber: order.table?.number ?? null,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/orders/:id]", error);
    return NextResponse.json({ error: "Error al cargar pedido" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await withAuth({ requiredRole: ["ADMIN", "OPERATOR", "SUPERADMIN", "RIDER"] });
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const { status: rawStatus } = body;

    const validStatus = rawStatus && Object.values(OrderStatus).includes(rawStatus)
      ? (rawStatus as OrderStatus)
      : undefined;

    if (!validStatus) {
      return NextResponse.json({ error: "Status invalido" }, { status: 400 });
    }

    // Verify order exists and user has access
    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true, clientId: true, riderId: true, restaurantId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const role = session.user.role as Role;

    // Riders can only update their own assigned orders
    if (role === "RIDER") {
      if (existing.riderId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      // Riders can only set DELIVERING, DELIVERED, or CANCELLED
      const allowedStatuses: OrderStatus[] = [OrderStatus.DELIVERING, OrderStatus.DELIVERED, OrderStatus.CANCELLED];
      if (!allowedStatuses.includes(validStatus as OrderStatus)) {
        return NextResponse.json({ error: "Repartidor solo puede cambiar a DELIVERING, DELIVERED o CANCELLED" }, { status: 403 });
      }
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: { status: validStatus },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        restaurant: {
          select: { id: true, name: true, address: true, lat: true, lng: true },
        },
        table: {
          select: { number: true },
        },
        rider: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            menuItem: {
              select: { name: true, price: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("[PATCH /api/orders/:id]", error);
    return NextResponse.json({ error: "Error al actualizar pedido" }, { status: 500 });
  }
}
