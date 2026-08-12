import { NavLink } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import { navItems } from './navItems';

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
        <UtensilsCrossed className="h-7 w-7 text-brand-600" aria-hidden="true" />
        <span className="text-lg font-bold text-gray-900">MenuGram</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navegación principal">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
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
