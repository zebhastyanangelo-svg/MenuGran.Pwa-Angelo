import { Input } from '../ui/Input';

export interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

const searchIcon = (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

export function SearchBar({
  searchQuery,
  onSearchChange,
  placeholder = 'Buscar comercios o platillos...',
}: SearchBarProps) {
  return (
    <Input
      type="search"
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder={placeholder}
      leftIcon={searchIcon}
      aria-label="Buscar en el marketplace"
    />
  );
}
