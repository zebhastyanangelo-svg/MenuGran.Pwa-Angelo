import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
      include: {
        categories: {
          orderBy: { order: "asc" },
          include: {
            items: {
              orderBy: { name: "asc" },
            },
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurante no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: restaurant });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Error al cargar el restaurante" },
      { status: 500 }
    );
  }
}