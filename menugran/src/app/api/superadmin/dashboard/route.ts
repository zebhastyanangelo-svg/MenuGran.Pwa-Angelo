import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

export async function GET() {
  try {
    const [totalBusinesses, totalRestaurants, totalUsers, totalOrders] = await Promise.all([
      prisma.business.count(),
      prisma.restaurant.count(),
      prisma.user.count(),
      prisma.order.count(),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [revenueResult, revenueTodayResult] = await Promise.all([
      prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: { status: OrderStatus.DELIVERED },
      }),
      prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: { status: OrderStatus.DELIVERED, createdAt: { gte: todayStart } },
      }),
    ]);

    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const topBusinesses = await prisma.business.findMany({
      include: {
        restaurants: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED },
            },
          },
        },
      },
    });

    const topBusinessesMapped = topBusinesses
      .map((b) => ({
        id: b.id,
        name: b.name,
        owner: '',
        orders: b.restaurants.reduce((sum, r) => sum + r.orders.length, 0),
        revenue: b.restaurants.reduce((sum, r) => sum + r.orders.reduce((s, o) => s + Number(o.totalPrice), 0), 0),
        rating: 0,
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: { select: { name: true } },
      },
    });

    const recentOrdersMapped = recentOrders.map((o) => ({
      id: o.id.slice(0, 8),
      business: o.restaurant.name,
      amount: o.totalPrice,
      time: new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(o.createdAt),
    }));

    return NextResponse.json({
      totalBusinesses,
      totalRestaurants,
      totalUsers,
      totalOrders,
      revenue: revenueResult._sum.totalPrice ?? 0,
      revenueToday: revenueTodayResult._sum.totalPrice ?? 0,
      ordersByStatus: ordersByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      topBusinesses: topBusinessesMapped,
      recentOrders: recentOrdersMapped,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cargar el dashboard' }, { status: 500 });
  }
}
