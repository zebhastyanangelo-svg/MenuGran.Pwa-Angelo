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
    const timer = window.setTimeout(() => {
      if (Math.random() < 0.06) {
        setError('No se pudo cargar el personal. Intenta de nuevo.');
      } else {
        setMembers(initialMembers);
      }
      setLoading(false);
    }, 650);

    return () => window.clearTimeout(timer);
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
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Gestión de personal</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{selectedRole}s</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Controla operadores y repartidores, activa o desactiva cuentas y administra credenciales desde un panel limpio.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openModal()}
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Agregar {selectedRole.toLowerCase()}
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('operators')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'operators'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Operadores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('riders')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'riders'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
              <p className="font-semibold">Error al cargar</p>
              <p className="mt-2">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError('');
                  window.location.reload();
                }}
                className="mt-4 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
              <p className="text-xl font-semibold text-slate-900">No hay {selectedRole.toLowerCase()}s registrados</p>
              <p className="mt-2 text-sm">Agrega tu primer miembro del staff para empezar a operar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500">Nombre</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Cédula</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Teléfono</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Estado</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 text-slate-900">{member.name}</td>
                      <td className="px-4 py-4 text-slate-700">{member.cedula}</td>
                      <td className="px-4 py-4 text-slate-700">{member.phone}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${member.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {member.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openModal(member)}
                            className="inline-flex items-center rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(member)}
                            className={`inline-flex items-center rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                              member.active
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
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
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{selectedMember ? 'Editar' : 'Agregar'} {selectedRole.toLowerCase()}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedMember ? selectedMember.name : `Nuevo ${selectedRole.toLowerCase()}`}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 transition hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre completo"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">Cédula</label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(event) => setCedula(event.target.value.replace(/\D/g, ''))}
                  placeholder="1234567890"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">Teléfono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+57 300 123 4567"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                  placeholder="4 dígitos"
                  maxLength={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveMember}
                disabled={saving || !name.trim() || !cedula.trim() || !phone.trim() || pin.length !== 4}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
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
