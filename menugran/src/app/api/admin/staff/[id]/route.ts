import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await withAuth({ requiredRole: ["ADMIN", "SUPER_ADMIN"] });
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await req.json();
    const { active } = body;

    if (active === undefined) {
      return NextResponse.json({ error: "active is required" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { active },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      cedula: user.cedula ?? "",
      phone: user.phone ?? "",
      role: user.role === "EMPLOYEE" ? "Operador" : "Repartidor",
      active: user.active,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
