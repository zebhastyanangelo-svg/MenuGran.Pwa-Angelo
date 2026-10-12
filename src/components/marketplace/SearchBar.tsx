import { Input } from '../ui/Input';

export interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

const searchIcon = (
  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
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
