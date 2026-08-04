'use client';

import { useEffect, useMemo, useState } from 'react';

type StaffMember = {
  id: string;
  name: string;
  cedula: string;
  phone: string;
  role: 'Operador' | 'Repartidor';
  active: boolean;
  pin: string;
};

const initialMembers: StaffMember[] = [
  { id: 's1', name: 'Ana Ramírez', cedula: '1012345678', phone: '+57 312 345 6789', role: 'Operador', active: true, pin: '1234' },
  { id: 's2', name: 'Jorge Pérez', cedula: '1098765432', phone: '+57 300 987 6543', role: 'Operador', active: false, pin: '5678' },
  { id: 's3', name: 'Carla Gómez', cedula: '1023456789', phone: '+57 320 111 2233', role: 'Repartidor', active: true, pin: '4321' },
  { id: 's4', name: 'Luis Torres', cedula: '1034567890', phone: '+57 311 222 3344', role: 'Repartidor', active: true, pin: '8765' },
];

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/admin/staff');
        if (!res.ok) throw new Error('Error al cargar');
        const data = await res.json();
        if (!cancelled) setMembers(data);
      } catch {
        if (!cancelled) setError('No se pudo cargar el personal. Intenta de nuevo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
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
    setPin(member?.pin ?? '');
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
    if (!name.trim() || !cedula.trim() || !phone.trim() || pin.length !== 4) {
      return;
    }

    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newMember: StaffMember = {
      id: selectedMember?.id ?? `staff_${Date.now()}`,
      name: name.trim(),
      cedula: cedula.trim(),
      phone: phone.trim(),
      role: selectedRole,
      active: selectedMember?.active ?? true,
      pin,
    };

    setMembers((current) => {
      if (selectedMember) {
        return current.map((item) => (item.id === selectedMember.id ? newMember : item));
      }
      return [newMember, ...current];
    });

    setSaving(false);
    closeModal();
  };

  const toggleActive = (member: StaffMember) => {
    if (member.active && !window.confirm('¿Seguro que quieres desactivar este miembro del staff?')) {
      return;
    }

    setMembers((current) =>
      current.map((item) =>
        item.id === member.id ? { ...item, active: !item.active } : item
      )
    );
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ink-lighter">Gestión de personal</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">{selectedRole}s</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-lighter">
              Controla operadores y repartidores, activa o desactiva cuentas y administra credenciales desde un panel limpio.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openModal()}
            className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Agregar {selectedRole.toLowerCase()}
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200">
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('operators')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'operators'
                  ? 'bg-brand-600 text-white'
                  : 'bg-cream-100 text-ink-light hover:bg-cream-200'
              }`}
            >
              Operadores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('riders')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'riders'
                  ? 'bg-brand-600 text-white'
                  : 'bg-cream-100 text-ink-light hover:bg-cream-200'
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
              className="w-full rounded-2xl border border-neutral-200 bg-cream-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-3xl bg-cream-100" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-brand-200 bg-brand-50 p-6 text-brand-700">
              <p className="font-semibold">Error al cargar</p>
              <p className="mt-2">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError('');
                  window.location.reload();
                }}
                className="mt-4 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Reintentar
              </button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-cream-50 p-10 text-center text-ink-lighter">
              <p className="text-xl font-semibold text-ink">No hay {selectedRole.toLowerCase()}s registrados</p>
              <p className="mt-2 text-sm">Agrega tu primer miembro del staff para empezar a operar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 font-semibold text-ink-lighter">Nombre</th>
                    <th className="px-4 py-3 font-semibold text-ink-lighter">Cédula</th>
                    <th className="px-4 py-3 font-semibold text-ink-lighter">Teléfono</th>
                    <th className="px-4 py-3 font-semibold text-ink-lighter">Estado</th>
                    <th className="px-4 py-3 font-semibold text-ink-lighter">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-cream-50">
                      <td className="px-4 py-4 text-ink">{member.name}</td>
                      <td className="px-4 py-4 text-ink-light">{member.cedula}</td>
                      <td className="px-4 py-4 text-ink-light">{member.phone}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${member.active ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-200 text-ink-lighter'}`}>
                          {member.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openModal(member)}
                            className="inline-flex items-center rounded-2xl bg-cream-100 px-3 py-2 text-sm font-semibold text-ink-light transition hover:bg-cream-200"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(member)}
                            className={`inline-flex items-center rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                              member.active
                                ? 'bg-cream-100 text-ink-light hover:bg-cream-200'
                                : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
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
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ink-lighter">{selectedMember ? 'Editar' : 'Agregar'} {selectedRole.toLowerCase()}</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">{selectedMember ? selectedMember.name : `Nuevo ${selectedRole.toLowerCase()}`}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-neutral-400 transition hover:text-ink-light"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <label htmlFor="staff-name" className="block text-sm font-semibold text-neutral-700">Nombre</label>
                <input
                  id="staff-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre completo"
                  className="w-full rounded-2xl border border-neutral-200 bg-cream-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
              <div className="space-y-4">
                <label htmlFor="staff-cedula" className="block text-sm font-semibold text-neutral-700">Cédula</label>
                <input
                  id="staff-cedula"
                  type="text"
                  value={cedula}
                  onChange={(event) => setCedula(event.target.value.replace(/\D/g, ''))}
                  placeholder="1234567890"
                  className="w-full rounded-2xl border border-neutral-200 bg-cream-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
              <div className="space-y-4">
                <label htmlFor="staff-phone" className="block text-sm font-semibold text-neutral-700">Teléfono</label>
                <input
                  id="staff-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+57 300 123 4567"
                  className="w-full rounded-2xl border border-neutral-200 bg-cream-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
              <div className="space-y-4">
                <label htmlFor="staff-pin" className="block text-sm font-semibold text-neutral-700">
                  PIN {selectedMember && '(dejar vacío para mantener actual)'}
                </label>
                <input
                  id="staff-pin"
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                  placeholder="4 dígitos"
                  maxLength={4}
                  className="w-full rounded-2xl border border-neutral-200 bg-cream-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl bg-cream-100 px-4 py-3 text-sm font-semibold text-ink-light transition hover:bg-cream-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveMember}
                disabled={saving || !name.trim() || !cedula.trim() || !phone.trim() || pin.length !== 4}
                className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
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
