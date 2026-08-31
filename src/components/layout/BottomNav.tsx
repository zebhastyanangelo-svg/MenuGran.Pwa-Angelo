import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useStaffPermissions } from '../../hooks/useStaffPermissions';
import { getNavItemsForRole } from './navItems';

export function BottomNav() {
  const { profile } = useAuth();
  const { permissions } = useStaffPermissions();
  const navItems = getNavItemsForRole(profile?.role, permissions);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm md:hidden"
      aria-label="Navegación principal"
    >
      <ul className="flex items-stretch justify-around">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-red' : 'text-slate-500'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
