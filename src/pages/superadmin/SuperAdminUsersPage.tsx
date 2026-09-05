import { Search, ShieldCheck, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useSuperAdminUsers } from '../../hooks/useSuperAdminUsers';
import type { UserRole } from '../../types/database';

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  merchant_owner: 'Comercio',
  merchant_staff: 'Comercio',
  driver: 'Repartidor',
  customer: 'Cliente',
};

const ROLE_BADGE_VARIANT: Record<UserRole, 'danger' | 'primary' | 'success' | 'info' | 'neutral'> = {
  superadmin: 'danger',
  merchant_owner: 'primary',
  merchant_staff: 'primary',
  driver: 'info',
  customer: 'success',
};

export function SuperAdminUsersPage() {
  const { users, isLoading, error, searchQuery, setSearchQuery } =
    useSuperAdminUsers();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10">
            <Users className="h-5 w-5 text-brand-red" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Gestión de Usuarios
            </h1>
            <p className="text-sm text-gray-500">
              Listado de todos los usuarios registrados en la plataforma.
            </p>
          </div>
        </header>

        <Card className="p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Buscar por nombre, correo o cédula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              aria-label="Buscar usuarios"
            />
          </div>
        </Card>

        {error !== null && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Card className="overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-600" role="status">
              Cargando usuarios...
            </p>
          ) : users.length === 0 ? (
            <p className="p-6 text-sm text-gray-600" role="status">
              {searchQuery.trim() !== ''
                ? 'No se encontraron usuarios que coincidan con la búsqueda.'
                : 'Aún no hay usuarios registrados.'}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 font-medium text-slate-600">
                        Nombre Completo
                      </th>
                      <th className="px-4 py-3 font-medium text-slate-600">
                        Correo Electrónico
                      </th>
                      <th className="px-4 py-3 font-medium text-slate-600">
                        C.I.
                      </th>
                      <th className="px-4 py-3 font-medium text-slate-600">
                        Teléfono
                      </th>
                      <th className="px-4 py-3 font-medium text-slate-600">
                        Rol
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        data-testid="user-row"
                        className="transition-colors hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {user.full_name ?? (
                            <span className="text-slate-400 italic">Sin nombre</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {user.ci ?? (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {user.phone ?? (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={ROLE_BADGE_VARIANT[user.role]}>
                            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                            {ROLE_LABELS[user.role]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                {users.length} usuario{users.length !== 1 ? 's' : ''} encontrado{users.length !== 1 ? 's' : ''}
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default SuperAdminUsersPage;
