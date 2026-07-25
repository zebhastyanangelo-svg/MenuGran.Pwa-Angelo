'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Eye, Edit3, Power } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  slug: string;
  owner: string;
  restaurants: number;
  active: boolean;
  logo?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const sampleUsers: User[] = [
  { id: 'u1', name: 'María García', email: 'maria@menugran.com' },
  { id: 'u2', name: 'Luis Fernández', email: 'luis@menugran.com' },
  { id: 'u3', name: 'Ana López', email: 'ana@menugran.com' },
];

const sampleBusinesses: Business[] = [
  { id: 'b1', name: 'La Casa del Sabor', slug: 'la-casa-del-sabor', owner: 'María García', restaurants: 8, active: true },
  { id: 'b2', name: 'Burger Factory', slug: 'burger-factory', owner: 'Luis Fernández', restaurants: 6, active: true },
  { id: 'b3', name: 'Sushi Express', slug: 'sushi-express', owner: 'Ana López', restaurants: 5, active: false },
  { id: 'b4', name: 'Taco Loco', slug: 'taco-loco', owner: 'María García', restaurants: 4, active: true },
  { id: 'b5', name: 'Pasta Studio', slug: 'pasta-studio', owner: 'Luis Fernández', restaurants: 3, active: true },
  { id: 'b6', name: 'Healthy Bites', slug: 'healthy-bites', owner: 'Ana López', restaurants: 5, active: false },
  { id: 'b7', name: 'Urban Pizza', slug: 'urban-pizza', owner: 'María García', restaurants: 7, active: true },
  { id: 'b8', name: 'Café Central', slug: 'cafe-central', owner: 'Luis Fernández', restaurants: 4, active: true },
  { id: 'b9', name: 'Noodle Lab', slug: 'noodle-lab', owner: 'Ana López', restaurants: 2, active: true },
  { id: 'b10', name: 'Parrilla 24/7', slug: 'parrilla-24-7', owner: 'María García', restaurants: 3, active: false },
  { id: 'b11', name: 'Green Bowl', slug: 'green-bowl', owner: 'Luis Fernández', restaurants: 4, active: true },
  { id: 'b12', name: 'Curry House', slug: 'curry-house', owner: 'Ana López', restaurants: 5, active: true },
];

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
  const [form, setForm] = useState({ name: '', slug: '', owner: sampleUsers[0].name, active: true });

  useEffect(() => {
    const load = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 900));
        setBusinesses(sampleBusinesses);
      } catch (err) {
        setError('Error al cargar los negocios');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((business) => {
      const matchSearch = [business.name, business.slug, business.owner].some((value) =>
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
    setForm({ name: '', slug: '', owner: sampleUsers[0].name, active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (business: Business) => {
    setEditingBusiness(business);
    setForm({ name: business.name, slug: business.slug, owner: business.owner, active: business.active });
    setIsModalOpen(true);
  };

  const saveBusiness = () => {
    if (!form.name) return;
    const slug = createSlug(form.name);
    if (editingBusiness) {
      setBusinesses((prev) =>
        prev.map((item) =>
          item.id === editingBusiness.id ? { ...item, ...form, slug } : item
        )
      );
    } else {
      const newBusiness: Business = {
        id: `b${businesses.length + 1}`,
        name: form.name,
        slug,
        owner: form.owner,
        restaurants: 1,
        active: form.active,
      };
      setBusinesses((prev) => [newBusiness, ...prev]);
    }
    setIsModalOpen(false);
  };

  const toggleBusinessStatus = () => {
    if (!confirmBusiness) return;
    setBusinesses((prev) =>
      prev.map((item) =>
        item.id === confirmBusiness.id ? { ...item, active: !item.active } : item
      )
    );
    setConfirmBusiness(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-6">
        <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/3 rounded-lg bg-slate-200" />
            <div className="grid gap-4 xl:grid-cols-3">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-32 rounded-3xl bg-slate-200" />
              ))}
            </div>
            <div className="h-96 rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-6">
        <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm text-center">
          <p className="text-red-600 text-lg font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Control de franquicias</p>
          <h1 className="text-3xl font-semibold text-slate-950">Gestión de negocios</h1>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Crear Nuevo Negocio
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar negocios, slugs o dueños"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </label>

          <div className="flex items-center gap-2 rounded-3xl bg-slate-50 p-3">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === 'all' ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-white'}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === 'active' ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-white'}`}
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setFilter('inactive')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === 'inactive' ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-white'}`}
            >
              Inactivos
            </button>
          </div>
        </div>

        {filteredBusinesses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-600">
            <p className="text-xl font-semibold text-slate-900">Aún no hay negocios para mostrar</p>
            <p className="mt-2">Crea un nuevo negocio para empezar a gestionar franquicias.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm text-slate-700">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Dueño</th>
                  <th className="px-4 py-3">Restaurantes</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagedBusinesses.map((business) => (
                  <tr key={business.id} className="rounded-3xl bg-white shadow-sm">
                    <td className="px-4 py-4 font-semibold text-slate-900">{business.name}</td>
                    <td className="px-4 py-4 text-slate-500">{business.slug}</td>
                    <td className="px-4 py-4 text-slate-700">{business.owner}</td>
                    <td className="px-4 py-4">{business.restaurants}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${business.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {business.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-4 space-x-2">
                      <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Eye className="h-4 w-4" />
                        Ver restaurantes
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(business)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmBusiness(business)}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${business.active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                      >
                        <Power className="h-4 w-4" />
                        {business.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm text-slate-500">
          <p>
            Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredBusinesses.length)} de {filteredBusinesses.length} negocios
          </p>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
              disabled={page === pageCount}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{editingBusiness ? 'Editar negocio' : 'Crear negocio'}</h2>
                <p className="text-sm text-slate-500">Completa los datos para administrar la franquicia.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">Cerrar</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">Nombre del negocio</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm({ ...form, name, slug: createSlug(name) });
                }}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
              <label className="block text-sm font-medium text-slate-700">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: createSlug(e.target.value) })}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
              <label className="block text-sm font-medium text-slate-700">Dueño</label>
              <select
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                {sampleUsers.map((user) => (
                  <option key={user.id} value={user.name}>{user.name}</option>
                ))}
              </select>
              <label className="block text-sm font-medium text-slate-700">Logo</label>
              <div className="flex h-16 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                Coloca aquí el logo
              </div>
              <label className="block text-sm font-medium text-slate-700">Activo</label>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
                className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold ${form.active ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
              >
                {form.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveBusiness}
                className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-950">¿Estás seguro?</h2>
            <p className="mt-3 text-sm text-slate-500">
              {confirmBusiness.active
                ? 'Desactivarás este negocio y sus restaurantes no estarán disponibles hasta nueva orden.'
                : 'Activarás este negocio y sus restaurantes volverán a estar disponibles.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmBusiness(null)}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={toggleBusinessStatus}
                className={`rounded-full px-5 py-3 text-sm font-semibold text-white ${confirmBusiness.active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {confirmBusiness.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
