import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurant = await prisma.restaurant.findFirst({
      where: { id: id, active: true },
      include: {
        categories: {
          orderBy: { order: 'asc' },
          include: {
            items: true,
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "Restaurante no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: restaurant });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
