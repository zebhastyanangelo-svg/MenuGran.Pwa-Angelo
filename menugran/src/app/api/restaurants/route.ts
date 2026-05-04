import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { active: true },
      include: {
        categories: {
          orderBy: { order: 'asc' },
          include: {
            items: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: restaurants,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Error al cargar restaurantes" },
      { status: 500 }
    );
  }
}