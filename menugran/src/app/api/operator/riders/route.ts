import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

export async function GET() {
  const session = await withAuth({ requiredRole: ["OPERATOR", "ADMIN", "SUPERADMIN"] });
  if (session instanceof NextResponse) return session;

  try {
    const riders = await prisma.user.findMany({
      where: {
        role: "RIDER",
        active: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: { name: "asc" },
    });

    const formatted = riders.map((rider) => ({
      id: rider.id,
      name: rider.name,
      phone: rider.phone,
      status: "available" as const,
      deliveredToday: 0,
      avgDeliveryTime: 0,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("[OPERATOR_RIDERS_GET]", error);
    return NextResponse.json({ error: "Error al cargar repartidores" }, { status: 500 });
  }
}
