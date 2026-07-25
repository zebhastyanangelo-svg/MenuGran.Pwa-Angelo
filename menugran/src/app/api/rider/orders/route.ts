import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";
import { OrderStatus, ServiceType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await withAuth({ requiredRole: "RIDER" });
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const view = searchParams.get("view"); // "assigned" or "available"

    const validStatus = status && Object.values(OrderStatus).includes(status as OrderStatus)
      ? (status as OrderStatus)
      : undefined;

    // "available" view: orders ready for pickup (no rider assigned, DELIVERY type)
    if (view === "available") {
      const orders = await prisma.order.findMany({
        where: {
          status: OrderStatus.READY,
          riderId: null,
          serviceType: ServiceType.DELIVERY,
          ...(validStatus ? { status: validStatus } : {}),
        },
        include: {
          client: {
            select: { id: true, name: true, phone: true },
          },
          restaurant: {
            select: { id: true, name: true, address: true, phone: true },
          },
          items: {
            include: {
              menuItem: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ orders });
    }

    // Default: rider's own assigned orders
    const orders = await prisma.order.findMany({
      where: {
        riderId: session.user.id,
        ...(validStatus ? { status: validStatus } : {}),
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        restaurant: {
          select: { id: true, name: true, address: true, phone: true },
        },
        items: {
          include: {
            menuItem: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[GET /api/rider/orders]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
