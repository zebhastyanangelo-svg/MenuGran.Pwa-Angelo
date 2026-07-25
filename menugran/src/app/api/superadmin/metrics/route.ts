import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

export async function GET() {
  try {
    const now = new Date();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [ordersLast7, ordersLast6Months, allDelivered, paymentMethods, userRoles] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, status: OrderStatus.DELIVERED },
        select: { totalPrice: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo }, status: OrderStatus.DELIVERED },
        select: { totalPrice: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.findMany({
        where: { status: OrderStatus.DELIVERED },
        select: { totalPrice: true, paymentMethod: true },
      }),
      prisma.order.groupBy({
        by: ['paymentMethod'],
        _count: { id: true },
        where: { status: OrderStatus.DELIVERED },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
    ]);

    const revenueByDay: { day: string; amount: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayOrders = ordersLast7.filter(
        (o) => o.createdAt.toISOString().slice(0, 10) === dayStr
      );
      revenueByDay.push({
        day: new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' }).format(d),
        amount: dayOrders.reduce((sum, o) => sum + Number(o.totalPrice), 0),
      });
    }

    const revenueByMonth: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().slice(0, 7);
      const monthOrders = ordersLast6Months.filter(
        (o) => o.createdAt.toISOString().slice(0, 7) === monthStr
      );
      revenueByMonth.push({
        month: new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(d),
        amount: monthOrders.reduce((sum, o) => sum + Number(o.totalPrice), 0),
      });
    }

    const totalRevenue = allDelivered.reduce((sum, o) => sum + Number(o.totalPrice), 0);
    const totalOrders = allDelivered.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const paymentMethodDistribution = paymentMethods.map((pm) => ({
      method: pm.paymentMethod,
      count: pm._count.id,
      percent: totalOrders > 0 ? Math.round((pm._count.id / totalOrders) * 100) : 0,
    }));

    const restaurantsWithRevenue = await prisma.restaurant.findMany({
      include: {
        orders: {
          where: { status: OrderStatus.DELIVERED },
          select: { totalPrice: true },
        },
      },
    });

    const topRestaurants = restaurantsWithRevenue
      .map((r) => ({
        name: r.name,
        orders: r.orders.length,
        revenue: r.orders.reduce((s, o) => s + Number(o.totalPrice), 0),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const userCountsByRole = userRoles.map((u) => ({
      role: u.role,
      count: u._count.id,
    }));

    return NextResponse.json({
      revenueByDay,
      revenueByMonth,
      totalRevenue,
      totalOrders,
      avgTicket,
      paymentMethodDistribution,
      topRestaurants,
      userCountsByRole,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cargar métricas' }, { status: 500 });
  }
}
