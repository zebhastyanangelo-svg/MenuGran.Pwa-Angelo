'use client';

import { useEffect, useState } from 'react';
import { Users, Search, ToggleLeft, ToggleRight, Shield, UserCircle } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string | null;
  cedula: string;
  phone: string | null;
  role: string;
  active: boolean;
  orderCount: number;
}

const roleColors: Record<string, string> = {
  SUPERADMIN: 'bg-brand-100 text-brand-600',
  ADMIN: 'bg-brand-100 text-brand-700',
  OPERATOR: 'bg-gold-100 text-gold-700',
  RIDER: 'bg-success-100 text-success-700',
  CLIENT: 'bg-neutral-100 text-neutral-700',
};

const roleLabels: Record<string, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Admin',
  OPERATOR: 'Operador',
  RIDER: 'Repartidor',
  CLIENT: 'Cliente',
};

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/superadmin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setError('Error al cargar usuarios');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleActive = async (userId: string, currentActive: boolean) => {
    setToggling(userId);
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, active: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, active: !currentActive } : u))
        );
      }
    } catch {
    } finally {
      setToggling(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.cedula.includes(search) ||
      (u.phone && u.phone.includes(search))
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-64 rounded-xl bg-neutral-200" />
        <div className="h-12 rounded-xl bg-neutral-200" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-neutral-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-brand-500 font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Gestión</p>
          <h1 className="text-3xl font-semibold text-ink">Usuarios</h1>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white border border-neutral-200 px-4 py-2.5 shadow-soft">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 bg-transparent text-sm text-ink outline-none placeholder:text-neutral-400 input"
          />
        </div>
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-soft transition hover:shadow-elevated"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold ${
                      user.active ? 'bg-neutral-100 text-neutral-700' : 'bg-neutral-200 text-neutral-400'
                    }`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-base font-semibold ${user.active ? 'text-ink' : 'text-neutral-400'}`}>
                        {user.name}
                      </p>
                      {!user.active && (
                        <span className="badge-neutral">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                      <span>{user.cedula}</span>
                      {user.phone && (
                        <>
                          <span className="text-neutral-300">·</span>
                          <span>{user.phone}</span>
                        </>
                      )}
                      {user.email && (
                        <>
                          <span className="text-neutral-300">·</span>
                          <span>{user.email}</span>
                        </>
                      )}
                      <span className="text-neutral-300">·</span>
                      <span>{user.orderCount} pedidos</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      roleColors[user.role] || 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {roleLabels[user.role] || user.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleActive(user.id, user.active)}
                    disabled={toggling === user.id}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      user.active
                        ? 'bg-success-100 text-success-700 hover:bg-success-200'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    } disabled:opacity-50`}
                  >
                    {user.active ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                    {user.active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
              <div className="mb-4 flex justify-center">
                <Users className="h-12 w-12 text-neutral-300" />
              </div>
              <p className="text-lg font-semibold text-neutral-500">No se encontraron usuarios</p>
            </div>
          )}
        </div>
      </div>
    );
}
