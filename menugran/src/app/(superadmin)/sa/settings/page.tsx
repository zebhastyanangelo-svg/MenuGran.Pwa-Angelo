'use client';

import { ShieldAlert, Info, ExternalLink } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  return (
    <div className="animate-fade-in">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Configuración</p>
      <h1 className="text-3xl font-semibold text-ink">Panel de control</h1>

      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-100 text-brand-500">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink">MenuGran SuperAdmin</h2>
            <p className="text-sm text-neutral-500">Panel de administración global</p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
          <Info className="h-5 w-5 text-neutral-500" />
          Acerca del Sistema
        </h3>
        <div className="space-y-4 text-sm text-neutral-600 leading-relaxed">
          <p>
            MenuGran es una plataforma de gestión de pedidos y restaurantes diseñada
            para facilitar la operación de negocios gastronómicos. El panel de
            SuperAdmin permite la administración global de todos los negocios,
            usuarios y métricas del sistema.
          </p>
          <div className="rounded-lg bg-neutral-50 p-4">
            <p className="font-semibold text-neutral-700 mb-2">Módulos disponibles:</p>
            <ul className="list-inside list-disc space-y-1 text-neutral-500">
              <li>Dashboard - Visión general del sistema</li>
              <li>Negocios - Gestión de negocios y restaurantes</li>
              <li>Usuarios - Administración de usuarios</li>
              <li>Métricas Globales - Estadísticas del sistema</li>
              <li>Configuración - Panel de control</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
        <h3 className="mb-4 text-lg font-semibold text-ink">Versión</h3>
        <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-4">
          <div>
            <p className="text-sm font-semibold text-neutral-700">Versión actual</p>
            <p className="text-sm text-neutral-500">1.0.0</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-brand-500">
            <ExternalLink className="h-4 w-4" />
            <span>Actualizado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
