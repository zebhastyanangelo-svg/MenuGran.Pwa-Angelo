interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="w-full bg-white border-b border-neutral-200 safe-area-top px-4">
      <div className="max-w-4xl mx-auto py-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ink truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {action && <div className="ml-4 flex-shrink-0">{action}</div>}
      </div>
    </header>
  );
}
