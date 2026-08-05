'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingCart, User } from 'lucide-react';

const tabs = [
  { label: 'Inicio', href: '/client', icon: Home },
  { label: 'Buscar', href: '/client?search=1', icon: Search },
  { label: 'Carrito', href: '#cart', icon: ShoppingCart, action: 'cart' as const },
  { label: 'Perfil', href: '/client/profile', icon: User },
];

interface StickyBottomNavProps {
  onCartClick?: () => void;
  cartCount?: number;
}

export default function StickyBottomNav({ onCartClick, cartCount = 0 }: StickyBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href || (tab.href !== '/client' && pathname.startsWith(tab.href.split('?')[0]));

          if (tab.action === 'cart') {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={onCartClick}
                className="bottom-nav-item relative cursor-pointer"
                aria-label={`Abrir carrito${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={isActive ? 'bottom-nav-item-active' : 'bottom-nav-item'}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
