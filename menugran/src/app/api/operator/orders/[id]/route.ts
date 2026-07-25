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
          select: { id: true, name: true, address: true },
        },
        table: {
          select: { id: true, number: true },
        },
        rider: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            menuItem: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const formatted = {
      id: order.id,
      number: `#${order.id.slice(-4).toUpperCase()}`,
      serviceType: order.serviceType,
      tableNumber: order.table?.number ?? null,
      table: order.table ?? null,
      status: order.status,
      total: order.totalPrice,
      paymentMethod: order.paymentMethod,
      client: order.client,
      restaurant: order.restaurant,
      deliveryAddress: order.deliveryAddress,
      lat: order.lat,
      lng: order.lng,
      notes: order.notes,
      items: order.items,
      rider: order.rider,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("[OPERATOR_ORDER_GET]", error);
    return NextResponse.json({ error: "Error al cargar pedido" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, riderId, riderName } = body;

    const validStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERING", "DELIVERED", "CANCELLED"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const current = await prisma.order.findUnique({
      where: { id: params.id },
      select: { serviceType: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (status === "DELIVERING" && current.serviceType === "MESA") {
      return NextResponse.json({ error: "Pedidos en mesa no pasan a DELIVERING" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (riderId) updateData.riderId = riderId;

    const order = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        restaurant: {
          select: { id: true, name: true, address: true },
        },
        table: {
          select: { id: true, number: true },
        },
        rider: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            menuItem: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });

    const formatted = {
      id: order.id,
      number: `#${order.id.slice(-4).toUpperCase()}`,
      serviceType: order.serviceType,
      tableNumber: order.table?.number ?? null,
      table: order.table ?? null,
      status: order.status,
      total: order.totalPrice,
      paymentMethod: order.paymentMethod,
      client: order.client,
      restaurant: order.restaurant,
      deliveryAddress: order.deliveryAddress,
      lat: order.lat,
      lng: order.lng,
      notes: order.notes,
      items: order.items,
      rider: order.rider,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("[OPERATOR_ORDER_PATCH]", error);
    return NextResponse.json({ error: "Error al actualizar pedido" }, { status: 500 });
  }
}
