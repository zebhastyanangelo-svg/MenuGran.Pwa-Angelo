import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import { withAuth } from '@/lib/api-auth';

export async function GET() {
  const session = await withAuth({ requiredRole: "SUPERADMIN" });
  if (session instanceof NextResponse) return session;

  try {
    const businesses = await prisma.business.findMany({
      include: {
        restaurants: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED },
              select: { totalPrice: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = businesses.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      logo: b.logo,
      active: b.active,
      createdAt: b.createdAt.toISOString(),
      restaurants: b.restaurants.length,
      totalOrders: b.restaurants.reduce((sum, r) => sum + r.orders.length, 0),
      totalRevenue: b.restaurants.reduce((sum, r) => sum + r.orders.reduce((s, o) => s + Number(o.totalPrice), 0), 0),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: 'Error al cargar negocios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await withAuth({ requiredRole: "SUPERADMIN" });
  if (session instanceof NextResponse) return session;

  try {
    const { name, slug, description } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nombre y slug son requeridos' }, { status: 400 });
    }

    const existing = await prisma.business.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 409 });
    }

    const business = await prisma.business.create({
      data: { name, slug, description },
    });

    return NextResponse.json(business, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear negocio' }, { status: 500 });
  }
}
