import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await withAuth({ requiredRole: "SUPERADMIN" });
  if (session instanceof NextResponse) return session;

  try {
    const { id } = params;
    const body = await req.json();

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await prisma.business.findUnique({ where: { slug: body.slug } });
      if (slugExists) {
        return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 409 });
      }
    }

    const business = await prisma.business.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });

    return NextResponse.json(business);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar negocio' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await withAuth({ requiredRole: "SUPERADMIN" });
  if (session instanceof NextResponse) return session;

  try {
    const { id } = params;

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    await prisma.business.delete({ where: { id } });

    return NextResponse.json({ message: 'Negocio eliminado' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar negocio' }, { status: 500 });
  }
}
