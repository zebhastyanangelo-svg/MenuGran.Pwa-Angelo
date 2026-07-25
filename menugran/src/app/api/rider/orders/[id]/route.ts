import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";
import { OrderStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await withAuth({ requiredRole: "RIDER" });
  if (session instanceof NextResponse) return session;

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
  const session = await withAuth({ requiredRole: "RIDER" });
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const { action, riderId, status } = body;

    if (action === "accept") {
      if (!riderId) {
        return NextResponse.json({ error: "riderId is required" }, { status: 400 });
      }

      // Riders can only accept orders as themselves
      if (riderId !== session.user.id) {
        return NextResponse.json({ error: "No puedes aceptar pedidos para otro repartidor" }, { status: 403 });
      }

      const order = await prisma.order.update({
        where: { id: params.id },
        data: {
          riderId,
          status: OrderStatus.DELIVERING,
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
      const validStatuses = [OrderStatus.DELIVERING, OrderStatus.DELIVERED, OrderStatus.CANCELLED];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      // Verify the order is assigned to this rider
      const existingOrder = await prisma.order.findUnique({
        where: { id: params.id },
        select: { riderId: true },
      });

      if (!existingOrder || existingOrder.riderId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
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
