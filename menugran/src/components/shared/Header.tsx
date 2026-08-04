import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="border-b border-neutral-200 bg-cream-50 px-4 py-5 md:px-6">
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{subtitle ?? 'Panel'}</p>
          <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">
            {title}
          </h1>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </header>
  );
}