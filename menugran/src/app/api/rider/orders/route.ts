import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const riderId = searchParams.get("riderId");
    const status = searchParams.get("status");

    if (riderId) {
      const orders = await prisma.order.findMany({
        where: {
          riderId,
          ...(status ? { status } : {}),
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
        status: "READY",
        riderId: null,
        serviceType: "DELIVERY",
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
