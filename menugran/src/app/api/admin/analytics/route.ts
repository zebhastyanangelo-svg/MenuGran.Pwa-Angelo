import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  MOBILE_PAYMENT: "Wallet",
  TRANSFER: "Transferencia",
};

const PAYMENT_COLORS: Record<string, string> = {
  CASH: "#f97316",
  MOBILE_PAYMENT: "#64748b",
  TRANSFER: "#3b82f6",
};

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export async function GET(_req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const allOrdersToday = await prisma.order.findMany({
      where: { createdAt: { gte: today, lte: todayEnd } },
      select: { totalPrice: true },
    });

    const salesToday = allOrdersToday.reduce((s, o) => s + Number(o.totalPrice), 0);
    const ordersTodayCount = allOrdersToday.length;
    const avgTicket = ordersTodayCount > 0 ? Math.round(salesToday / ordersTodayCount) : 0;

    const weekOrders = await prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { totalPrice: true, createdAt: true },
    });

    const salesByDay: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const dayOrders = weekOrders.filter((o) => o.createdAt >= start && o.createdAt <= end);
      const amount = dayOrders.reduce((s, o) => s + Number(o.totalPrice), 0);

      salesByDay.push({ day: DAY_NAMES[date.getDay()], amount: Math.round(amount) });
    }

    const paymentGroups = await prisma.order.groupBy({
      by: ["paymentMethod"],
      _count: true,
    });
    const totalPayOrders = paymentGroups.reduce((s, g) => s + g._count, 0);
    const paymentMethods = paymentGroups.map((g) => ({
      label: PAYMENT_LABELS[g.paymentMethod] || g.paymentMethod,
      value: totalPayOrders > 0 ? Math.round((g._count / totalPayOrders) * 100) : 0,
      color: PAYMENT_COLORS[g.paymentMethod] || "#64748b",
    }));

    const topDishesRaw = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });

    const topDishes = await Promise.all(
      topDishesRaw.map(async (item, idx) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          include: { category: { select: { name: true } } },
        });

        const orderItemsForDish = await prisma.orderItem.findMany({
          where: { menuItemId: item.menuItemId },
          select: { price: true, quantity: true },
        });
        const totalSold = orderItemsForDish.reduce((s, oi) => s + Number(oi.price), 0);

        return {
          rank: idx + 1,
          name: menuItem?.name ?? "Unknown",
          category: menuItem?.category.name ?? "Unknown",
          times: item._sum.quantity ?? 0,
          total: Math.round(totalSold),
        };
      })
    );

    const topDishName = topDishes[0]?.name ?? "N/A";

    return NextResponse.json({
      metrics: {
        salesToday: Math.round(salesToday),
        ordersToday: ordersTodayCount,
        avgTicket,
        topDish: topDishName,
      },
      salesByDay,
      paymentMethods,
      topDishes,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
