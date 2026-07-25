import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, confirmed, preparing, ready, delivering, todayOrders] = await Promise.all([
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.order.count({ where: { status: "PREPARING" } }),
      prisma.order.count({ where: { status: "READY" } }),
      prisma.order.count({ where: { status: "DELIVERING" } }),
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
