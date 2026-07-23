import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
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
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[GET /api/rider/orders/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, riderId, status } = body;

    if (action === "accept") {
      if (!riderId) {
        return NextResponse.json({ error: "riderId is required" }, { status: 400 });
      }

      const order = await prisma.order.update({
        where: { id: params.id },
        data: {
          riderId,
          status: "DELIVERING",
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
      });

      return NextResponse.json({ order });
    }

    if (status) {
      const validStatuses = ["DELIVERING", "DELIVERED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      const order = await prisma.order.update({
        where: { id: params.id },
        data: { status },
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
      });

      return NextResponse.json({ order });
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/rider/orders/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
