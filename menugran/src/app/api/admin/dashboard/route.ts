import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const session = await withAuth({ requiredRole: ["ADMIN", "SUPERADMIN"] });
  if (session instanceof NextResponse) return session;

  try {
    // Un admin puede gestionar varios restaurantes
    const managedRestaurants = await prisma.restaurant.findMany({
      where: { adminId: session.user.id },
      select: { id: true },
    });

    if (managedRestaurants.length === 0) {
      return NextResponse.json({ error: "No se encontro restaurante para este admin" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const requestedRestaurantId = searchParams.get("restaurantId");

    const restaurantId =
      requestedRestaurantId &&
      managedRestaurants.some((r) => r.id === requestedRestaurantId)
        ? requestedRestaurantId
        : managedRestaurants[0].id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersToday = await prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: today } },
      include: { items: true, client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const totalSalesToday = ordersToday.reduce((sum, o) => sum + Number(o.totalPrice), 0);

    const statusCounts = await prisma.order.groupBy({
      by: ["status"],
      where: { restaurantId },
      _count: true,
    });

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((s) => { byStatus[s.status] = s._count; });

    const allOrders = await prisma.order.findMany({
      where: { restaurantId },
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentOrders = allOrders.map((o) => ({
      id: o.id,
      number: `#${o.id.slice(-4)}`,
      client: o.client.name,
      items: o.items.length,
      total: o.totalPrice,
      status: o.status,
    }));

    return NextResponse.json({
      metrics: {
        salesToday: totalSalesToday,
        ordersToday: ordersToday.length,
        avgTicket: ordersToday.length > 0 ? Math.round(totalSalesToday / ordersToday.length) : 0,
      },
      byStatus,
      recentOrders,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
