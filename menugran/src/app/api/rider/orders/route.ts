import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";
import { OrderStatus, ServiceType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await withAuth({ requiredRole: "RIDER" });
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = req.nextUrl;
    const riderId = searchParams.get("riderId");
    const status = searchParams.get("status");

    if (riderId) {
      const validStatus = status && Object.values(OrderStatus).includes(status as OrderStatus)
        ? (status as OrderStatus)
        : undefined;

      const orders = await prisma.order.findMany({
        where: {
          riderId,
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

    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.READY,
        riderId: null,
        serviceType: ServiceType.DELIVERY,
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
