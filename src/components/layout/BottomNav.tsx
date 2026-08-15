import { NavLink } from 'react-router-dom';
import { navItems } from './navItems';

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-nav md:hidden"
      aria-label="Navegación principal"
    >
      <ul className="flex items-stretch justify-around">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 text-xs font-medium ${
                  isActive ? 'text-brand-red' : 'text-slate-500'
                }`
              }
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
