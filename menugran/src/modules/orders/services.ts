import prisma from '@/lib/db';

export async function createOrder(
  clientId: string,
  data: {
    restaurantId: string;
    items: Array<{
      menuItemId: string;
      quantity: number;
      observations?: string;
    }>;
    paymentMethod: string;
    deliveryAddress?: string;
  }
) {
  try {
    // Calculate total first
    let totalPrice = 0;
    const orderItems = [];

    for (const item of data.items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem || !menuItem.available) {
        return {
          success: false,
          error: `Item ${menuItem?.name || 'desconocido'} no disponible`,
        };
      }

      const itemTotal = menuItem.price * item.quantity;
      totalPrice += itemTotal;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: menuItem.price,
      });
    }

    const order = await prisma.order.create({
      data: {
        clientId,
        restaurantId: data.restaurantId,
        status: 'PENDING',
        totalPrice,
        paymentMethod: data.paymentMethod as any,
        deliveryAddress: data.deliveryAddress,
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    });

    return { success: true, data: order };
  } catch (error) {
    console.error('[createOrder]', error);
    return { success: false, error: 'Error al crear orden' };
  }
}

export async function getOrdersByUser(userId: string) {
  try {
    const orders = await prisma.order.findMany({
      where: { clientId: userId },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: orders };
  } catch (error) {
    console.error('[getOrdersByUser]', error);
    return { success: false, error: 'Error al obtener órdenes' };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string
) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
    });

    return { success: true, data: order };
  } catch (error) {
    console.error('[updateOrderStatus]', error);
    return { success: false, error: 'Error al actualizar orden' };
  }
}

