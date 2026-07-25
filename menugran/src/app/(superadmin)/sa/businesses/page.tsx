'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Eye, Edit3, Power, Trash2 } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  active: boolean;
  createdAt: string;
  restaurants: number;
  totalOrders: number;
  totalRevenue: number;
}

const createSlug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function SuperAdminBusinessesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [confirmBusiness, setConfirmBusiness] = useState<Business | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Business | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', active: true });
  const [saving, setSaving] = useState(false);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/superadmin/businesses');
      if (!res.ok) throw new Error('Error');
      const json = await res.json();
      setBusinesses(json);
    } catch {
      setError('Error al cargar los negocios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((business) => {
      const matchSearch = [business.name, business.slug].some((value) =>
        value.toLowerCase().includes(search.toLowerCase())
      );
      const matchFilter = filter === 'all' || (filter === 'active' ? business.active : !business.active);
      return matchSearch && matchFilter;
    });
  }, [businesses, search, filter]);

  const pageSize = 10;
  const pageCount = Math.ceil(filteredBusinesses.length / pageSize);
  const pagedBusinesses = filteredBusinesses.slice((page - 1) * pageSize, page * pageSize);

  const openCreateModal = () => {
    setEditingBusiness(null);
    setForm({ name: '', slug: '', description: '', active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (business: Business) => {
    setEditingBusiness(business);
    setForm({ name: business.name, slug: business.slug, description: business.description ?? '', active: business.active });
    setIsModalOpen(true);
  };

  const saveBusiness = async () => {
    if (!form.name || !form.slug) return;
    setSaving(true);
    try {
      if (editingBusiness) {
        const res = await fetch(`/api/superadmin/businesses/${editingBusiness.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error);
          return;
        }
      } else {
        const res = await fetch('/api/superadmin/businesses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error);
          return;
        }
      }
      await fetchBusinesses();
      setIsModalOpen(false);
    } catch {
      alert('Error al guardar el negocio');
    } finally {
      setSaving(false);
    }
  };

  const toggleBusinessStatus = async () => {
    if (!confirmBusiness) return;
    try {
      const res = await fetch(`/api/superadmin/businesses/${confirmBusiness.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !confirmBusiness.active }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      await fetchBusinesses();
    } catch {
      alert('Error al cambiar estado');
    } finally {
      setConfirmBusiness(null);
    }
  };

  const deleteBusiness = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/superadmin/businesses/${confirmDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      await fetchBusinesses();
    } catch {
      alert('Error al eliminar negocio');
    } finally {
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-6">
        <div className="overflow-hidden rounded-xl bg-white p-6 shadow-soft">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/3 rounded-lg bg-neutral-200" />
            <div className="grid gap-4 xl:grid-cols-3">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-32 rounded-xl bg-neutral-200" />
              ))}
            </div>
            <div className="h-96 rounded-xl bg-neutral-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-6">
        <div className="rounded-xl border border-brand-200 bg-white p-8 shadow-soft text-center">
          <p className="text-brand-500 text-lg font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-6 md:px-8 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">Control de franquicias</p>
          <h1 className="text-3xl font-semibold text-ink">Gestión de negocios</h1>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="btn-primary btn-md"
        >
          <Plus className="h-4 w-4" />
          Crear Nuevo Negocio
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white p-6 shadow-soft">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar negocios o slugs"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-11"
            />
          </label>

          <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setFilter('inactive')}
              className={`btn-sm ${filter === 'inactive' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Inactivos
            </button>
          </div>
        </div>

        {filteredBusinesses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-12 text-center text-neutral-600">
            <p className="text-xl font-semibold text-ink">Aún no hay negocios para mostrar</p>
            <p className="mt-2">Crea un nuevo negocio para empezar a gestionar franquicias.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm text-neutral-700">
              <thead>
                <tr className="text-neutral-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Restaurantes</th>
                  <th className="px-4 py-3">Pedidos</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagedBusinesses.map((business) => (
                  <tr key={business.id} className="rounded-xl bg-white shadow-soft">
                    <td className="px-4 py-4 font-semibold text-ink">{business.name}</td>
                    <td className="px-4 py-4 text-neutral-500">{business.slug}</td>
                    <td className="px-4 py-4">{business.restaurants}</td>
                    <td className="px-4 py-4">{business.totalOrders}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${business.active ? 'bg-success-100 text-success-700' : 'bg-brand-100 text-brand-600'}`}>
                        {business.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-4 space-x-2">
                      <button className="btn-secondary btn-sm">
                        <Eye className="h-4 w-4" />
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(business)}
                        className="btn-secondary btn-sm"
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmBusiness(business)}
                        className={`btn-sm ${business.active ? 'btn-secondary' : 'btn-secondary'}`}
                      >
                        <Power className="h-4 w-4" />
                        {business.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(business)}
                        className="btn-danger btn-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm text-neutral-500">
          <p>
            Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredBusinesses.length)} de {filteredBusinesses.length} negocios
          </p>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="btn-secondary btn-sm"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
              disabled={page === pageCount}
              className="btn-secondary btn-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-elevated">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-ink">{editingBusiness ? 'Editar negocio' : 'Crear negocio'}</h2>
                <p className="text-sm text-neutral-500">Completa los datos para administrar la franquicia.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-neutral-700">Cerrar</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-neutral-700">Nombre del negocio</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm({ ...form, name, slug: createSlug(name) });
                }}
                className="input"
              />
              <label className="block text-sm font-medium text-neutral-700">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="input"
              />
              <label className="block text-sm font-medium text-neutral-700">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input"
                rows={3}
              />
              <label className="block text-sm font-medium text-neutral-700">Activo</label>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
                className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold ${form.active ? 'bg-success-600 text-white' : 'bg-brand-500 text-white'}`}
              >
                {form.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary btn-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveBusiness}
                disabled={saving}
                className="btn-primary btn-md"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-elevated">
            <h2 className="text-xl font-semibold text-ink">¿Estás seguro?</h2>
            <p className="mt-3 text-sm text-neutral-500">
              {confirmBusiness.active
                ? 'Desactivarás este negocio y sus restaurantes no estarán disponibles hasta nueva orden.'
                : 'Activarás este negocio y sus restaurantes volverán a estar disponibles.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmBusiness(null)}
                className="btn-secondary btn-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={toggleBusinessStatus}
                className={`btn-md text-white ${confirmBusiness.active ? 'btn-primary' : 'btn-primary'}`}
              >
                {confirmBusiness.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-elevated">
            <h2 className="text-xl font-semibold text-ink">Eliminar negocio</h2>
            <p className="mt-3 text-sm text-neutral-500">
              ¿Estás seguro de eliminar <strong>{confirmDelete.name}</strong>? Esta acción no se puede deshacer y eliminará todos sus restaurantes y datos asociados.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary btn-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={deleteBusiness}
                className="btn-danger btn-md"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
