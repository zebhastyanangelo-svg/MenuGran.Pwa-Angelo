import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await withAuth({ requiredRole: ["ADMIN", "SUPERADMIN"] });
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await withAuth({ requiredRole: ["ADMIN", "SUPERADMIN"] });
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await req.json();
    const { available } = body;

    if (available === undefined) {
      return NextResponse.json({ error: "available is required" }, { status: 400 });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { available },
      include: { category: { select: { name: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description ?? "",
      categoryId: updated.categoryId,
      categoryName: updated.category.name,
      price: updated.price,
      available: updated.available,
      image: updated.image ?? "",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
