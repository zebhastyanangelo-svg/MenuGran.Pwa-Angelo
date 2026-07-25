import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const restaurant = await prisma.restaurant.findFirst({
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!restaurant) {
      return NextResponse.json({ success: false, error: "No hay restaurantes" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        business: restaurant.business,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/restaurant]", error);
    return NextResponse.json({ error: "Error al cargar restaurante" }, { status: 500 });
  }
}
