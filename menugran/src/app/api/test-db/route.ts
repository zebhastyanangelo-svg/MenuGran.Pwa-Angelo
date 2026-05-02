import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        cedula: true,
        role: true,
        active: true,
      },
      take: 5,
    });

    const businesses = await prisma.business.count();
    const restaurants = await prisma.restaurant.count();
    const orders = await prisma.order.count();
    const menuItems = await prisma.menuItem.count();

    return NextResponse.json({
      success: true,
      database: "✅ Connected to Supabase",
      data: {
        users: {
          count: users.length,
          samples: users,
        },
        statistics: {
          businesses,
          restaurants,
          orders,
          menuItems,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/test-db]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
