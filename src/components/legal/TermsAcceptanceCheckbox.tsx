import { Link } from 'react-router-dom';

interface TermsAcceptanceCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const LINK_CLASS = 'font-medium text-brand-red underline underline-offset-2 hover:text-[#c80024]';

/**
 * Checkbox obligatorio de aceptación de Términos y Condiciones y Política de
 * Privacidad, con enlaces a las páginas legales. Se usa en el registro y en
 * el checkout antes de procesar datos del usuario.
 */
export function TermsAcceptanceCheckbox({ id, checked, onChange }: TermsAcceptanceCheckboxProps) {
  return (
    <div className="flex items-start gap-2" data-testid="terms-acceptance">
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-red accent-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
      />
      <label htmlFor={id} className="text-xs leading-relaxed text-slate-600">
        Acepto los{' '}
        <Link to="/terms" className={LINK_CLASS}>
          Términos y Condiciones
        </Link>{' '}
        y la{' '}
        <Link to="/privacy" className={LINK_CLASS}>
          Política de Privacidad
        </Link>
        .
      </label>
    </div>
  );
}
