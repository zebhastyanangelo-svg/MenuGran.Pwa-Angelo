import { NavLink } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getNavItemsForRole } from './navItems';

export function Sidebar() {
  const { profile } = useAuth();
  const navItems = getNavItemsForRole(profile?.role);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-slate-50 md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 bg-white/80 px-5 backdrop-blur-sm">
        <UtensilsCrossed className="h-7 w-7 text-brand-red" aria-hidden="true" />
        <span className="text-lg font-bold text-slate-900">MenuGram</span>
      </div>
      <nav className="flex-1 space-y-2 px-3 py-4" aria-label="Navegación principal">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-red text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
