import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

export async function GET() {
  const session = await withAuth({ requiredRole: "SUPERADMIN" });
  if (session instanceof NextResponse) return session;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        role: true,
        active: true,
        _count: {
          select: { clientOrders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      cedula: user.cedula,
      phone: user.phone,
      role: user.role,
      active: user.active,
      orderCount: user._count.clientOrders,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("[GET /api/superadmin/users]", error);
    return NextResponse.json({ error: "Error al cargar usuarios" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await withAuth({ requiredRole: "SUPERADMIN" });
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { id, active } = body;

    if (!id || active === undefined) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { active },
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        role: true,
        active: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[PATCH /api/superadmin/users]", error);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}
