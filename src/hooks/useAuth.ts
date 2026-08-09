import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';

/**
 * Hook de acceso al contexto de autenticación.
 *
 * Lanza un error si se usa fuera de un `AuthProvider`, para detectar
 * usos incorrectos en tiempo de desarrollo.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
