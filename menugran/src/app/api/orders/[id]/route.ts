import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

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
  try {
    const body = await req.json();
    const { status: rawStatus } = body;

    const validStatus = rawStatus && Object.values(OrderStatus).includes(rawStatus)
      ? (rawStatus as OrderStatus)
      : undefined;

    const order = await prisma.order.update({
      where: { id: params.id },
      data: { ...(validStatus ? { status: validStatus } : {}) },
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
