'use client';

import { useEffect, useMemo, useState } from 'react';

type StaffMember = {
  id: string;
  name: string;
  cedula: string;
  phone: string;
  role: 'Operador' | 'Repartidor';
  active: boolean;
};

const roles = {
  operators: 'Operador',
  riders: 'Repartidor',
} as const;

type StaffTab = keyof typeof roles;

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<StaffTab>('operators');
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff');
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setMembers(data);
    } catch {
      setError('No se pudo cargar el personal. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const selectedRole = roles[activeTab];

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return members
      .filter((member) => member.role === selectedRole)
      .filter(
        (member) =>
          member.name.toLowerCase().includes(query) ||
          member.cedula.toLowerCase().includes(query)
      );
  }, [members, search, selectedRole]);

  const openModal = (member?: StaffMember) => {
    setSelectedMember(member ?? null);
    setName(member?.name ?? '');
    setCedula(member?.cedula ?? '');
    setPhone(member?.phone ?? '');
    setPin('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedMember(null);
    setName('');
    setCedula('');
    setPhone('');
    setPin('');
    setIsModalOpen(false);
  };

  const saveMember = async () => {
    if (!name.trim() || !cedula.trim() || !phone.trim() || pin.length !== 4) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), cedula: cedula.trim(), phone: phone.trim(), pin, role: selectedRole };

      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }
      const saved = await res.json();

      setMembers((current) => {
        if (selectedMember) {
          return current.map((item) => (item.id === selectedMember.id ? saved : item));
        }
        return [saved, ...current];
      });

      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    if (member.active && !window.confirm('¿Seguro que quieres desactivar este miembro del staff?')) return;

    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !member.active }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      const updated = await res.json();
      setMembers((current) =>
        current.map((item) => (item.id === member.id ? updated : item))
      );
    } catch {
      setError('Error al cambiar estado');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="rounded-xl bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Gestión de personal</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">{selectedRole}s</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-500">
              Controla operadores y repartidores, activa o desactiva cuentas y administra credenciales desde un panel limpio.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openModal()}
            className="btn-primary btn-md"
          >
            Agregar {selectedRole.toLowerCase()}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('operators')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'operators'
                  ? 'bg-brand-500 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Operadores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('riders')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'riders'
                  ? 'bg-brand-500 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Repartidores
            </button>
          </div>
          <div className="flex w-full items-center gap-3 md:w-96">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o cédula"
              className="input"
            />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-brand-600">
              <p className="font-semibold">Error al cargar</p>
              <p className="mt-2">{error}</p>
              <button
                type="button"
                onClick={fetchStaff}
                className="btn-primary btn-md mt-4"
              >
                Reintentar
              </button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-neutral-600">
              <p className="text-xl font-semibold text-ink">No hay {selectedRole.toLowerCase()}s registrados</p>
              <p className="mt-2 text-sm">Agrega tu primer miembro del staff para empezar a operar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Nombre</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Cédula</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Teléfono</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Estado</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-4 text-ink">{member.name}</td>
                      <td className="px-4 py-4 text-neutral-700">{member.cedula}</td>
                      <td className="px-4 py-4 text-neutral-700">{member.phone}</td>
                      <td className="px-4 py-4">
                        <span className={`${member.active ? 'badge-success' : 'badge-neutral'}`}>
                          {member.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openModal(member)}
                            className="btn-ghost btn-sm"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(member)}
                            className={`btn-ghost btn-sm ${
                              member.active
                                ? ''
                                : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                            }`}
                          >
                            {member.active ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">{selectedMember ? 'Editar' : 'Agregar'} {selectedRole.toLowerCase()}</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">{selectedMember ? selectedMember.name : `Nuevo ${selectedRole.toLowerCase()}`}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-neutral-400 transition hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-neutral-700">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre completo"
                  className="input"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-neutral-700">Cédula</label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(event) => setCedula(event.target.value.replace(/\D/g, ''))}
                  placeholder="1234567890"
                  className="input"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-neutral-700">Teléfono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+57 300 123 4567"
                  className="input"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-neutral-700">
                  PIN {selectedMember && '(dejar vacío para mantener actual)'}
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                  placeholder="4 dígitos"
                  maxLength={4}
                  className="input"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary btn-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveMember}
                disabled={saving || !name.trim() || !cedula.trim() || !phone.trim() || (!selectedMember && pin.length !== 4)}
                className="btn-primary btn-md"
              >
                {saving ? 'Guardando...' : selectedMember ? 'Guardar cambios' : 'Guardar miembro'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
