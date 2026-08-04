'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Package, LayoutDashboard, Store, Users } from 'lucide-react';

export default function AdminDashboard() {
  const globalMetrics = [
    { label: 'Usuarios Activos', value: '4,820', icon: Users, color: 'text-brand-600' },
    { label: 'Comercios Registrados', value: '356', icon: Store, color: 'text-sage-500' },
    { label: 'Tráfico Hoy', value: '3,420', icon: TrendingUp, color: 'text-blue-600' },
  ];

  const metrics = [
    { label: 'Ventas Hoy', value: '$1,250,000', icon: TrendingUp, color: 'text-sage-500' },
    { label: 'Pedidos Hoy', value: '24', icon: Package, color: 'text-blue-600' },
    { label: 'Ticket Promedio', value: '$52,000', icon: LayoutDashboard, color: 'text-purple-600' },
    { label: 'Plato Estrella', value: 'Parrilla Mixta', icon: Store, color: 'text-brand-600' },
  ];

  const recentOrders = [
    { number: '#001', client: 'Juan Cliente', items: 3, total: '$45,000', status: 'Pendiente' },
    { number: '#002', client: 'Ana García', items: 2, total: '$28,000', status: 'Confirmado' },
    { number: '#003', client: 'Carlos López', items: 5, total: '$72,000', status: 'Cocinando' },
    { number: '#004', client: 'María Pérez', items: 1, total: '$15,000', status: 'Listo' },
  ];

  const statusColors: Record<string, string> = {
    'Pendiente': 'bg-yellow-100 text-yellow-700',
    'Confirmado': 'bg-blue-100 text-blue-700',
    'Cocinando': 'bg-orange-100 text-orange-700',
    'Listo': 'bg-sage-100 text-sage-700',
  };

  const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const salesData = [850000, 920000, 780000, 1100000, 1250000, 1400000, 980000];
  const maxSale = Math.max(...salesData);

  return (
    <div>
      <p className="section-eyebrow mb-1">Resumen</p>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Bienvenido, Admin</h1>
      <p className="text-ink-lighter mb-6 font-body">Resumen global de la plataforma MenuGran</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {globalMetrics.map((metric) => (
          <div key={metric.label} className="receipt">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-lighter font-body">{metric.label}</p>
                <p className="text-2xl font-bold text-ink mt-1">{metric.value}</p>
              </div>
              <metric.icon className={`h-8 w-8 ${metric.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric) => (
          <div key={metric.label} className="receipt">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-lighter font-body">{metric.label}</p>
                <p className="text-2xl font-bold text-ink mt-1">{metric.value}</p>
              </div>
              <metric.icon className={`h-8 w-8 ${metric.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 receipt">
          <h2 className="font-display text-lg font-semibold text-ink mb-4">Ventas Últimos 7 Días</h2>
          <div className="flex items-end justify-between h-48">
            {weekDays.map((day, i) => (
              <div key={day} className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-ink">
                  ${(salesData[i] / 1000).toFixed(0)}k
                </span>
                <div
                  className="w-10 bg-brand-500 rounded-t-lg hover:bg-brand-600 transition"
                  style={{ height: `${(salesData[i] / maxSale) * 150}px` }}
                />
                <span className="text-xs text-ink-lighter font-body">{day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="receipt">
          <h2 className="font-display text-lg font-semibold text-ink mb-4">Pedidos por Estado</h2>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink-lighter font-body">Pendientes</span>
              <span className="font-semibold text-yellow-600">8</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-lighter font-body">Confirmados</span>
              <span className="font-semibold text-blue-600">5</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-lighter font-body">Cocinando</span>
              <span className="font-semibold text-orange-600">7</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-lighter font-body">Listos</span>
              <span className="font-semibold text-sage-600">4</span>
            </div>
          </div>
        </div>
      </div>

      <div className="receipt">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="font-display text-lg font-semibold text-ink">Últimos Pedidos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-ink-lighter uppercase font-body">Pedido</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-ink-lighter uppercase font-body">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-ink-lighter uppercase font-body">Items</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-ink-lighter uppercase font-body">Total</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-ink-lighter uppercase font-body">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {recentOrders.map((order) => (
                <tr key={order.number} className="hover:bg-cream-50">
                  <td className="py-3 px-4 text-sm font-medium text-ink font-body">{order.number}</td>
                  <td className="py-3 px-4 text-sm text-ink-lighter font-body">{order.client}</td>
                  <td className="py-3 px-4 text-sm text-ink-lighter font-body">{order.items}</td>
                  <td className="py-3 px-4 text-sm font-medium text-ink font-body">{order.total}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium font-body ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}