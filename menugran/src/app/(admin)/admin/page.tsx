'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Package, LayoutDashboard } from 'lucide-react';

export default function AdminDashboard() {
  const metrics = [
    { label: 'Ventas Hoy', value: '$1,250,000', icon: TrendingUp, color: 'text-green-600' },
    { label: 'Pedidos Hoy', value: '24', icon: Package, color: 'text-blue-600' },
    { label: 'Ticket Promedio', value: '$52,000', icon: LayoutDashboard, color: 'text-purple-600' },
    { label: 'Plato Estrella', value: 'Parrilla Mixta', icon: Store, color: 'text-red-600' },
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
    'Listo': 'bg-green-100 text-green-700',
  };

  const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const salesData = [850000, 920000, 780000, 1100000, 1250000, 1400000, 980000];
  const maxSale = Math.max(...salesData);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
              </div>
              <metric.icon className={`h-8 w-8 ${metric.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventas Ultimos 7 Dias</h2>
          <div className="flex items-end justify-between h-48">
            {weekDays.map((day, i) => (
              <div key={day} className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-900">
                  ${(salesData[i] / 1000).toFixed(0)}k
                </span>
                <div
                  className="w-10 bg-red-500 rounded-t-lg hover:bg-red-600 transition"
                  style={{ height: `${(salesData[i] / maxSale) * 150}px` }}
                />
                <span className="text-xs text-gray-500">{day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pedidos por Estado</h2>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pendientes</span>
              <span className="font-semibold text-yellow-600">8</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Confirmados</span>
              <span className="font-semibold text-blue-600">5</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cocinando</span>
              <span className="font-semibold text-orange-600">7</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Listos</span>
              <span className="font-semibold text-green-600">4</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Ultimos Pedidos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Pedido</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <tr key={order.number} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{order.number}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{order.client}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{order.items}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{order.total}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
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