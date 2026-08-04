import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-next';
import { prisma } from '@/lib/db';
import {
  Store,
  MapPin,
  Globe,
  LogOut,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Plus,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';

const mockDishes = [
  { name: 'Hamburguesa Clásica', price: 18500, category: 'Hamburguesas' },
  { name: 'Perro Especial', price: 12500, category: 'Perros' },
  { name: 'Jugos Naturales', price: 6500, category: 'Bebidas' },
];

const mockStaff = [
  { name: 'Carlos Pérez', role: 'Cajero' },
  { name: 'Ana Gómez', role: 'Cocinero' },
  { name: 'Juan Rodríguez', role: 'Repartidor' },
];

export default async function MerchantPortalDashboard() {
  const session = await auth();

  if (!session?.user?.id || session?.user?.role !== 'MERCHANT') {
    redirect('/login');
  }

  const businesses = await prisma.business.findMany({
    where: { ownerId: session.user.id as string },
    orderBy: { createdAt: 'desc' },
  });

  const quickAccess = [
    {
      href: '#metricas',
      icon: TrendingUp,
      title: 'Métricas del Negocio',
      description: 'Ventas, clientes y pedidos en tiempo real.',
    },
    {
      href: '#menu',
      icon: UtensilsCrossed,
      title: 'Gestión de Menú',
      description: 'Crea y edita los platos de tu menú digital.',
    },
    {
      href: '#personal',
      icon: Users,
      title: 'Vista de Empleados',
      description: 'Administra tu equipo y sus roles.',
    },
  ];

  return (
    <div className="min-h-screen bg-cream-50">
      <nav className="bg-white shadow-sm border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-7 w-7 text-brand-600" />
            <span className="text-xl font-bold text-ink">Portal del Comercio</span>
          </div>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2 text-sm text-ink-lighter hover:text-brand-600 transition"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-ink mb-2">Hola, {session.user.name}</h1>
        <p className="text-ink-lighter mb-8">Dashboard principal de tu negocio en MenuGran</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {quickAccess.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 hover:shadow-md transition flex flex-col gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                <item.icon className="h-6 w-6 text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
                <p className="text-sm text-ink-lighter mt-1">{item.description}</p>
              </div>
            </a>
          ))}
        </div>

        <section id="metricas" className="scroll-mt-24 mb-10">
          <h2 className="text-lg font-semibold text-ink mb-4">Métricas del Negocio</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
              <p className="text-sm text-ink-lighter">Ventas hoy</p>
              <p className="text-3xl font-bold text-ink mt-1">$1.250.000</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
              <p className="text-sm text-ink-lighter">Clientes hoy</p>
              <p className="text-3xl font-bold text-ink mt-1">38</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
              <p className="text-sm text-ink-lighter">Pedidos pendientes</p>
              <p className="text-3xl font-bold text-ink mt-1">5</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400 mt-3">Datos de demostración mientras llega el backend.</p>
        </section>

        <section id="menu" className="scroll-mt-24 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Menú</h2>
            <button type="button" className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition">
              <Plus className="h-4 w-4" />
              Nuevo plato
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 divide-y divide-gray-100">
            {mockDishes.map((dish) => (
              <div key={dish.name} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-cream-100 flex items-center justify-center">
                    <UtensilsCrossed className="h-5 w-5 text-ink-lighter" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{dish.name}</p>
                    <p className="text-sm text-ink-lighter">{dish.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-ink">${dish.price.toLocaleString('es-CO')}</span>
                  <button type="button" className="flex items-center gap-2 text-sm text-ink-lighter hover:text-brand-600 transition">
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-3">Menú de demostración — edición disponible próximamente.</p>
        </section>

        <section id="personal" className="scroll-mt-24 mb-10">
          <h2 className="text-lg font-semibold text-ink mb-4">Vista de Empleados</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 divide-y divide-gray-100">
            {mockStaff.map((person) => (
              <div key={person.name} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-semibold">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{person.name}</p>
                    <p className="text-sm text-ink-lighter">{person.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink mb-4">Mis Comercios</h2>
          {businesses.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-10 text-center">
              <Store className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink mb-1">
                Aún no tienes negocios registrados
              </h3>
              <p className="text-sm text-ink-lighter">
                Próximamente podrás crear y gestionar tu menú digital aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {businesses.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-ink">{b.name}</h3>
                    {b.active ? (
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Activo
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-cream-100 text-ink-lighter px-2 py-1 rounded-full">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-ink-lighter">
                    {b.description && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-neutral-400" />
                        {b.description}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-neutral-400" />
                      /r/{b.slug}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}