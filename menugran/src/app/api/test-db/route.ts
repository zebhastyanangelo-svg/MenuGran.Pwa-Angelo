import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, cedula: true, pin: true, role: true, active: true },
    });
    const restaurants = await prisma.restaurant.count();
    const menuItems = await prisma.menuItem.count();

    return NextResponse.json({
      success: true,
      data: {
        users,
        counts: {
          restaurants,
          menuItems,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
