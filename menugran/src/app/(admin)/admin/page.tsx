'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Package, LayoutDashboard, Store } from 'lucide-react';

type DashboardData = {
  metrics: { salesToday: number; ordersToday: number; avgTicket: number };
  byStatus: Record<string, number>;
  recentOrders: Array<{ id: string; number: string; client: string; items: number; total: number; status: string }>;
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmado', PREPARING: 'Cocinando',
  READY: 'Listo', DELIVERING: 'Entregando', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};

const statusColors: Record<string, string> = {
  PENDING: 'badge-warning', CONFIRMED: 'bg-brand-50 text-brand-600',
  PREPARING: 'bg-warning-50 text-warning-600', READY: 'bg-success-50 text-success-600',
  DELIVERING: 'bg-brand-100 text-brand-700', DELIVERED: 'badge-success',
  CANCELLED: 'badge-danger',
};

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">{[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse bg-neutral-100 rounded-xl" />)}</div>;

  if (!data) return <div className="text-danger-500 p-4 font-semibold">Error al cargar datos</div>;

  const { metrics, byStatus, recentOrders } = data;
  const metricsCards = [
    { label: 'Ventas Hoy', value: fmt(metrics.salesToday), icon: TrendingUp, color: 'text-success-600' },
    { label: 'Pedidos Hoy', value: String(metrics.ordersToday), icon: Package, color: 'text-brand-500' },
    { label: 'Ticket Promedio', value: fmt(metrics.avgTicket), icon: LayoutDashboard, color: 'text-warning-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {metricsCards.map((m) => (
          <div key={m.label} className="bg-white rounded-xl shadow-soft p-5 border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">{m.label}</p>
                <p className="text-2xl font-bold text-ink mt-1">{m.value}</p>
              </div>
              <m.icon className={`h-8 w-8 ${m.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-soft p-6 border border-neutral-200">
          <h2 className="text-lg font-semibold text-ink mb-4">Pedidos por Estado</h2>
          <div className="space-y-4">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-neutral-500">{statusLabels[status] || status}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
            {Object.keys(byStatus).length === 0 && <p className="text-neutral-400 text-sm">Sin pedidos</p>}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-soft p-6 border border-neutral-200">
          <h2 className="text-lg font-semibold text-ink mb-4">Últimos Pedidos</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase">Pedido</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase">Cliente</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase">Items</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase">Total</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50">
                    <td className="py-3 px-4 text-sm font-medium text-ink">{order.number}</td>
                    <td className="py-3 px-4 text-sm text-neutral-500">{order.client}</td>
                    <td className="py-3 px-4 text-sm text-neutral-500">{order.items}</td>
                    <td className="py-3 px-4 text-sm font-medium text-ink">{fmt(order.total)}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${statusColors[order.status] || ''}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-neutral-400">No hay pedidos recientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
