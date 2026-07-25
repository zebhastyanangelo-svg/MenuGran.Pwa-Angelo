import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET: Obtener todos los pedidos activos (operador/admin)
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          notIn: ['DELIVERED', 'CANCELLED'],
        },
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        restaurant: {
          select: { id: true, name: true },
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

    // Formatear para el frontend
    const formattedOrders = orders.map((order) => {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        id: order.id,
        number: `#${order.id.slice(-4).toUpperCase()}`,
        type: order.deliveryAddress ? 'DELIVERY' : 'LOCAL',
        status: order.status,
        total: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentStatus: 'CONFIRMED',
        clientName: order.client.name || 'Sin nombre',
        clientPhone: order.client.phone || 'Sin telefono',
        address: order.deliveryAddress || 'Mesa',
        items: itemCount,
        createdAt: order.createdAt.toISOString(),
        riderId: order.riderId,
        riderName: null,
      };
    });

    return NextResponse.json({ success: true, data: formattedOrders });
  } catch (error) {
    console.error('[GET /api/orders]', error);
    return NextResponse.json({ error: 'Error al cargar pedidos' }, { status: 500 });
  }
}

// POST: Crear un nuevo pedido (cliente)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, restaurantId, items, deliveryAddress } = body;

    if (!clientId || !restaurantId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Calcular total
    let totalPrice = 0;
    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });
      if (menuItem) {
        totalPrice += menuItem.price * item.quantity;
      }
    }

    const order = await prisma.order.create({
      data: {
        clientId,
        restaurantId,
        totalPrice,
        deliveryAddress: deliveryAddress || null,
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