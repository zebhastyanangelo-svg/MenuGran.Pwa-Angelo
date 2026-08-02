import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await withAuth();
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { riderId: true, serviceType: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (!order.riderId) {
      return NextResponse.json({ data: null });
    }

    const location = await prisma.location.findUnique({
      where: { userId: order.riderId },
      select: {
        latitude: true,
        longitude: true,
        timestamp: true,
      },
    });

    return NextResponse.json({ data: location });
  } catch (error) {
    console.error("[GET /api/orders/:id/rider-location]", error);
    return NextResponse.json({ error: "Error al obtener ubicacion" }, { status: 500 });
  }
}
