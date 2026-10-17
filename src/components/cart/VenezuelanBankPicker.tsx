import { useEffect, useMemo, useState } from 'react';
import { searchVenezuelanBanks } from '../../utils/venezuelanBanks';

/**
 * Buscador de banco emisor del Pago Móvil.
 *
 * El catálogo de la SUDEBAN tiene más de veinte instituciones, así que un
 * `<select>` obliga a scrollear una lista larga. Aquí el campo filtra por
 * nombre, código o alias mientras se escribe, y el texto heredado de un
 * comercio dado de alta antes del selector sigue siendo elegible.
 */

export interface VenezuelanBankPickerProps {
  id: string;
  label: string;
  /** Nombre canónico del banco seleccionado, o cadena vacía si no hay ninguno. */
  value: string;
  onChange: (bankName: string) => void;
  hint?: string;
  placeholder?: string;
  invalid?: boolean;
}

/** Una opción del buscador: un banco del catálogo o el texto heredado. */
interface BankChoice {
  value: string;
  code: string;
}

const LISTBOX_CLASS =
  'absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg';

/** Arma la lista de sugerencias a partir del catálogo filtrado. */
function buildChoices(query: string, persistedValue: string): BankChoice[] {
  const result = searchVenezuelanBanks(query, persistedValue);
  const legacy: BankChoice[] = result.legacy ? [{ value: result.legacy, code: '' }] : [];
  const catalog: BankChoice[] = result.banks.map((bank) => ({
    value: bank.name,
    code: bank.code,
  }));
  return [...legacy, ...catalog];
}

function BankSuggestion({
  choice,
  optionId,
  isActive,
  onSelect,
}: {
  choice: BankChoice;
  optionId: string;
  isActive: boolean;
  onSelect: (choice: BankChoice) => void;
}) {
  return (
    <li
      id={optionId}
      role="option"
      aria-selected={isActive}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(choice)}
      className={`flex cursor-pointer items-baseline justify-between gap-2 px-3 py-2 text-left text-sm ${
        isActive ? 'bg-brand-red/10 text-brand-red' : 'text-slate-700'
      }`}
    >
      <span className="truncate">{choice.value}</span>
      {choice.code && (
        <span className="shrink-0 font-mono text-xs text-slate-400">{choice.code}</span>
      )}
    </li>
  );
}

export function VenezuelanBankPicker({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder = 'Buscar banco emisor',
  invalid = false,
}: VenezuelanBankPickerProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  /**
   * `-1` significa "nada resaltado". Con el catálogo completo abierto, el primer
   * banco es Banco de Venezuela: si venía resaltado, bastaba enfocar el campo y
   * pulsar Enter para guardar un banco que el cliente nunca eligió. Ahora solo
   * se selecciona algo que el usuario señaló con las flechas o con el ratón.
   */
  const [activeIndex, setActiveIndex] = useState(-1);

  // El valor puede llegar desde fuera (carga inicial o reinicio del formulario):
  // el texto del campo debe seguirlo sin que el usuario tenga que retiparlo.
  useEffect(() => {
    setQuery(value);
    setActiveIndex(-1);
  }, [value]);

  const choices = useMemo(() => buildChoices(query, value), [query, value]);
  const listboxId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const hasChoices = choices.length > 0;

  const selectChoice = (choice: BankChoice) => {
    onChange(choice.value);
    setQuery(choice.value);
    setActiveIndex(-1);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => Math.min(Math.max(index + delta, 0), choices.length - 1));
      return;
    }
    // Enter solo elige si el usuario ya está señalando una sugerencia.
    if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      const choice = choices[activeIndex];
      if (!choice) return;
      event.preventDefault();
      selectChoice(choice);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setActiveIndex(-1);
    setIsOpen(true);
  };

  return (
    <div data-testid={id}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <i
          className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
          aria-hidden="true"
        />
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          aria-invalid={invalid || undefined}
          value={query}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={handleKeyDown}
          className={`h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
            invalid
              ? 'border-red-300 focus:border-red-300 focus:ring-red-300'
              : 'border-slate-200 focus:border-brand-red focus:ring-brand-red'
          }`}
        />
        {isOpen && hasChoices && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className={LISTBOX_CLASS}
          >
            {choices.map((choice, index) => (
              <BankSuggestion
                key={`${choice.code}-${choice.value}`}
                choice={choice}
                optionId={optionId(index)}
                isActive={index === activeIndex}
                onSelect={selectChoice}
              />
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {hint ?? 'Escribe el nombre o el código de institución para filtrar.'}
      </p>
    </div>
  );
}