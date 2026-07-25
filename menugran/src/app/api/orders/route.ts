import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where: any = {};

    if (userId) {
      where.clientId = userId;
    } else {
      where.status = {
        notIn: ['DELIVERED', 'CANCELLED'],
      };
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
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = orders.map((order) => {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        id: order.id,
        number: `#${order.id.slice(-4).toUpperCase()}`,
        serviceType: order.serviceType,
        status: order.status,
        total: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentStatus: 'CONFIRMED',
        clientName: order.client.name || 'Sin nombre',
        clientPhone: order.client.phone || 'Sin telefono',
        address: order.deliveryAddress || (order.table ? `Mesa ${order.table.number}` : 'Mesa'),
        tableNumber: order.table?.number ?? null,
        lat: order.lat,
        lng: order.lng,
        items: itemCount,
        createdAt: order.createdAt.toISOString(),
        riderId: order.riderId,
        riderName: null,
        restaurantName: order.restaurant.name,
        restaurantId: order.restaurant.id,
      };
    });

    return NextResponse.json({ success: true, data: formattedOrders });
  } catch (error) {
    console.error('[GET /api/orders]', error);
    return NextResponse.json({ error: 'Error al cargar pedidos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, restaurantId, items, serviceType, tableNumber, lat, lng, deliveryAddress } = body;

    if (!clientId || !restaurantId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const service = serviceType === 'DELIVERY' ? 'DELIVERY' : 'MESA';

    let tableId: string | undefined;

    if (service === 'MESA') {
      if (!tableNumber) {
        return NextResponse.json({ error: 'Número de mesa requerido para pedidos en mesa' }, { status: 400 });
      }
      const existing = await prisma.table.findUnique({
        where: { restaurantId_number: { restaurantId, number: tableNumber } },
      });
      if (existing) {
        tableId = existing.id;
      } else {
        const created = await prisma.table.create({
          data: { restaurantId, number: tableNumber },
        });
        tableId = created.id;
      }
    }

    let totalPrice = 0;
    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });
      if (menuItem) {
        totalPrice += Number(menuItem.price) * item.quantity;
      }
    }

    const order = await prisma.order.create({
      data: {
        clientId,
        restaurantId,
        totalPrice,
        serviceType: service,
        tableId: tableId || null,
        deliveryAddress: service === 'DELIVERY' ? (deliveryAddress || null) : null,
        lat: service === 'DELIVERY' ? (lat || null) : null,
        lng: service === 'DELIVERY' ? (lng || null) : null,
        status: 'PENDING',
        paymentMethod: body.paymentMethod || 'CASH',
        items: {
          create: items.map((item: any) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price || 0,
          })),
        },
      },
      include: {
        client: { select: { name: true, phone: true } },
        restaurant: { select: { name: true } },
        table: { select: { number: true } },
        items: {
          include: {
            menuItem: { select: { name: true, price: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/orders]', error);
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 });
  }
}
