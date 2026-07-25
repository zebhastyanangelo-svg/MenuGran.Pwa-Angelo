// components/shared/Header.tsx - Header compartido

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 pt-safe px-4">
      <div className="max-w-4xl mx-auto py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
