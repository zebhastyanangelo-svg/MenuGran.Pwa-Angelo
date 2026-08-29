import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export interface LogoutButtonProps {
  /** Clases CSS adicionales para personalizar el estilo del botón. */
  className?: string;
  /** Texto de la etiqueta. Por defecto: "Cerrar sesión". */
  label?: string;
  /** Clases CSS para el icono LogOut. Por defecto: "h-5 w-5". */
  iconClassName?: string;
}

/**
 * Botón reutilizable de cierre de sesión.
 *
 * Invoca `signOut()` del contexto de autenticación y redirige al usuario a
 * `/login` al completarse (incluso si `signOut` falla).
 */
export function LogoutButton({
  className = '',
  label = 'Cerrar sesión',
  iconClassName = 'h-5 w-5',
}: LogoutButtonProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch {
      // El logout puede fallar; redirigir de todos modos al login.
    } finally {
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={isLoggingOut}
      aria-label="Cerrar sesión"
      className={className}
    >
      <LogOut className={iconClassName} aria-hidden="true" />
      <span>{isLoggingOut ? 'Cerrando sesión...' : label}</span>
    </button>
  );
}
