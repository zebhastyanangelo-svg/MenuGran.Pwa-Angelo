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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-7 w-7 text-red-600" />
            <span className="text-xl font-bold text-gray-900">Portal del Comercio</span>
          </div>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hola, {session.user.name}</h1>
        <p className="text-gray-500 mb-8">Dashboard principal de tu negocio en MenuGran</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {quickAccess.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition flex flex-col gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <item.icon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              </div>
            </a>
          ))}
        </div>

        <section id="metricas" className="scroll-mt-24 mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Métricas del Negocio</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">Ventas hoy</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">$1.250.000</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">Clientes hoy</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">38</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">Pedidos pendientes</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">5</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Datos de demostración mientras llega el backend.</p>
        </section>

        <section id="menu" className="scroll-mt-24 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Menú</h2>
            <button type="button" className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
              <Plus className="h-4 w-4" />
              Nuevo plato
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            {mockDishes.map((dish) => (
              <div key={dish.name} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-gray-100 flex items-center justify-center">
                    <UtensilsCrossed className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{dish.name}</p>
                    <p className="text-sm text-gray-500">{dish.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">${dish.price.toLocaleString('es-CO')}</span>
                  <button type="button" className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition">
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Menú de demostración — edición disponible próximamente.</p>
        </section>

        <section id="personal" className="scroll-mt-24 mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vista de Empleados</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            {mockStaff.map((person) => (
              <div key={person.name} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-semibold">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{person.name}</p>
                    <p className="text-sm text-gray-500">{person.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mis Comercios</h2>
          {businesses.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
              <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Aún no tienes negocios registrados
              </h3>
              <p className="text-sm text-gray-500">
                Próximamente podrás crear y gestionar tu menú digital aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {businesses.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{b.name}</h3>
                    {b.active ? (
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Activo
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    {b.description && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {b.description}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
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