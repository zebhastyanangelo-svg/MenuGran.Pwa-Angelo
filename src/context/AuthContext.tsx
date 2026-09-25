import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { ProfileRow, UserRole } from '../types/database';
import { requiresEmailConfirmation } from '../utils/emailSuggestions';
import { AuthContext, type AuthContextValue, type SignUpResult } from './auth-context-core';
import { fetchProfile } from './auth-profile';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(
    async (userId: string, email: string | null = null): Promise<void> => {
      const currentProfile = await fetchProfile(userId, email);
      setProfile(currentProfile);
    },
    [],
  );

  const handleAuthEvent = useCallback(
    (event: AuthChangeEvent, nextSession: Session | null): void => {
      switch (event) {
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
          setSession(nextSession);
          if (nextSession?.user !== undefined) {
            void refreshProfile(nextSession.user.id, nextSession.user.email ?? null);
          }
          break;
        case 'TOKEN_REFRESHED':
          setSession(nextSession);
          break;
        case 'USER_UPDATED':
          setSession(nextSession);
          if (nextSession?.user !== undefined) {
            void refreshProfile(nextSession.user.id, nextSession.user.email ?? null);
          }
          break;
        case 'SIGNED_OUT':
          setSession(null);
          setProfile(null);
          break;
        default:
          break;
      }
    },
    [refreshProfile],
  );

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session?.user !== undefined) {
        // Esperar el perfil antes de quitar el estado de carga para que las
        // guardias de ruta validen el rol real desde el primer render.
        await refreshProfile(data.session.user.id, data.session.user.email ?? null);
      }
      if (!isMounted) return;
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        handleAuthEvent(event, nextSession);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [handleAuthEvent, refreshProfile]);

  const signInWithGoogle = useCallback(
    async (redirectPath?: string | null): Promise<void> => {
      try {
        // Se aterriza en '/' para que el router resuelva por rol real del
        // perfil (owner/staff → /admin, driver → /driver/deliveries, etc.).
        const fromQuery =
          redirectPath !== undefined && redirectPath !== null && redirectPath !== ''
            ? `?from=${encodeURIComponent(redirectPath)}`
            : '';
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/${fromQuery}` },
        });
        if (error !== null) throw error;
      } catch (error) {
        console.error('Error al iniciar sesión con Google', error);
        throw error;
      }
    },
    [],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error !== null) throw error;
      } catch (error) {
        console.error('Error al iniciar sesión con email y contraseña', error);
        throw error;
      }
    },
    [],
  );

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: UserRole,
    ): Promise<SignUpResult> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
            },
          },
        });
        if (error !== null) throw error;
        return {
          needsEmailConfirmation: requiresEmailConfirmation(data.user),
        };
      } catch (error) {
        console.error('Error al registrar usuario con email y contraseña', error);
        throw error;
      }
    },
    [],
  );

  const resendConfirmationEmail = useCallback(
    async (email: string): Promise<void> => {
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        });
        if (error !== null) throw error;
      } catch (error) {
        console.error('Error al reenviar el email de confirmación', error);
        throw error;
      }
    },
    [],
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error !== null) throw error;
    } catch (error) {
      console.error('Error al cerrar sesión', error);
      throw error;
    }
  }, []);

  const user = session?.user ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
       signInWithGoogle,
       signInWithPassword,
       signUpWithPassword,
       resendConfirmationEmail,
       signOut,
     }),
     [
       user,
       profile,
       isLoading,
       signInWithGoogle,
       signInWithPassword,
       signUpWithPassword,
       resendConfirmationEmail,
       signOut,
     ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
