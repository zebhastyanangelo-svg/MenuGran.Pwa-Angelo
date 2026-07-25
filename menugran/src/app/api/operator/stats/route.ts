import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, confirmed, preparing, ready, delivering, todayOrders] = await Promise.all([
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
      prisma.order.count({ where: { status: OrderStatus.PREPARING } }),
      prisma.order.count({ where: { status: OrderStatus.READY } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERING } }),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        pending,
        confirmed,
        preparing,
        ready,
        delivering,
        todayOrders,
      },
    });
  } catch (error) {
    console.error("[OPERATOR_STATS_GET]", error);
    return NextResponse.json({ error: "Error al cargar estadísticas" }, { status: 500 });
  }
}
