import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";
import { OrderStatus, ServiceType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await withAuth({ requiredRole: ["OPERATOR", "ADMIN", "SUPERADMIN"] });
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await withAuth({ requiredRole: ["OPERATOR", "ADMIN", "SUPERADMIN"] });
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  try {
    const body = await req.json();
    const { status: rawStatus, riderId, riderName } = body;

    const validStatus = rawStatus && Object.values(OrderStatus).includes(rawStatus)
      ? (rawStatus as OrderStatus)
      : undefined;

    const current = await prisma.order.findUnique({
      where: { id },
      select: { serviceType: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (validStatus === OrderStatus.DELIVERING && current.serviceType === ServiceType.MESA) {
      return NextResponse.json({ error: "Pedidos en mesa no pasan a DELIVERING" }, { status: 400 });
    }

    const updateData: { status?: OrderStatus; riderId?: string } = {};
    if (validStatus) updateData.status = validStatus;
    if (riderId) updateData.riderId = riderId;

    const order = await prisma.order.update({
      where: { id },
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
