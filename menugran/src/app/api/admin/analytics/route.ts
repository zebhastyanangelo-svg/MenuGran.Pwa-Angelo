import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  MOBILE_PAYMENT: "Pago móvil",
};

// Paleta Okabe-Ito (segura para daltonismo / WCAG AA)
const PAYMENT_COLORS: Record<string, string> = {
  CASH: "#009e73",
  CARD: "#e69f00",
  TRANSFER: "#0072b2",
  MOBILE_PAYMENT: "#cc79a7",
};

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

type Period = "hoy" | "semana" | "mes";

const PERIOD_DAYS: Record<Period, number> = {
  hoy: 0,
  semana: 6,
  mes: 29,
};

export async function GET(req: NextRequest) {
  const session = await withAuth({ requiredRole: ["ADMIN", "SUPER_ADMIN"] });
  if (session instanceof NextResponse) return session;

  try {
    // Admin puede gestionar varios restaurantes
    const managedRestaurants = await prisma.restaurant.findMany({
      where: { adminId: session.user.id },
      select: { id: true },
    });

    if (managedRestaurants.length === 0) {
      return NextResponse.json(
        { error: "No se encontro restaurante para este admin" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedRestaurantId = searchParams.get("restaurantId");
    const requestedPeriod = searchParams.get("period") as Period | null;

    const restaurantId =
      requestedRestaurantId &&
      managedRestaurants.some((r) => r.id === requestedRestaurantId)
        ? requestedRestaurantId
        : managedRestaurants[0].id;

    const period: Period =
      requestedPeriod && requestedPeriod in PERIOD_DAYS ? requestedPeriod : "hoy";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const periodStart = new Date(today);
    periodStart.setDate(today.getDate() - PERIOD_DAYS[period]);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const allOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: periodStart, lte: todayEnd },
      },
      select: { totalPrice: true, createdAt: true },
    });

    const sales = allOrders.reduce((s, o) => s + Number(o.totalPrice), 0);
    const ordersCount = allOrders.length;
    const avgTicket =
      ordersCount > 0 ? Math.round(sales / ordersCount) : 0;

    const salesByDay: { day: string; amount: number }[] = [];
    for (let i = PERIOD_DAYS[period]; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const dayOrders = allOrders.filter(
        (o) => o.createdAt >= startOfDay && o.createdAt <= endOfDay
      );
      const amount = dayOrders.reduce((s, o) => s + Number(o.totalPrice), 0);

      salesByDay.push({ day: DAY_NAMES[date.getDay()], amount: Math.round(amount) });
    }

    const paymentGroups = await prisma.order.groupBy({
      by: ["paymentMethod"],
      where: {
        restaurantId,
        createdAt: { gte: periodStart, lte: todayEnd },
      },
      _count: true,
    });
    const totalPayOrders = paymentGroups.reduce((s, g) => s + g._count, 0);
    const paymentMethods = paymentGroups.map((g) => ({
      label: PAYMENT_LABELS[g.paymentMethod] || g.paymentMethod,
      value: totalPayOrders > 0 ? Math.round((g._count / totalPayOrders) * 100) : 0,
      count: g._count,
      total: totalPayOrders,
      color: PAYMENT_COLORS[g.paymentMethod] || "#64748b",
    }));

    const topDishesRaw = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
      where: {
        order: {
          restaurantId,
          createdAt: { gte: periodStart, lte: todayEnd },
        },
      },
    });

    const topDishIds = topDishesRaw.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: topDishIds } },
      include: { category: { select: { name: true } } },
    });
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    const topDishes = topDishesRaw.map((item, idx) => {
      const menuItem = menuItemMap.get(item.menuItemId);
      const quantity = item._sum.quantity ?? 0;
      const price = menuItem?.price ? Number(menuItem.price) : 0;

      return {
        rank: idx + 1,
        name: menuItem?.name ?? "Unknown",
        category: menuItem?.category.name ?? "Unknown",
        times: quantity,
        total: Math.round(price * quantity),
      };
    });

    const topDishName = topDishes[0]?.name ?? "N/A";

    return NextResponse.json({
      period,
      restaurants: managedRestaurants.map((r) => ({ id: r.id })),
      metrics: {
        sales: Math.round(sales),
        orders: ordersCount,
        avgTicket,
        topDish: topDishName,
      },
      salesByDay,
      paymentMethods,
      topDishes,
    });
  } catch (error) {
    console.error("[GET /api/admin/analytics]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}