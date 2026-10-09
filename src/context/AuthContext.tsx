import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import posthog, { isPostHogEnabled, syncPostHogConsent } from '../posthog';
import { supabase } from '../services/supabase';
import type { ProfileRow, UserRole } from '../types/database';
import { requiresEmailConfirmation } from '../utils/emailSuggestions';
import { COOKIE_CONSENT_EVENT, hasAnalyticsConsent } from '../utils/cookieConsent';
import { AuthContext, type AuthContextValue, type SignUpResult } from './auth-context-core';
import { fetchProfile } from './auth-profile';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const identifiedUserIdRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const identifySession = useCallback((nextSession: Session): void => {
    const { user } = nextSession;

    if (!isPostHogEnabled || identifiedUserIdRef.current === user.id) return;

    // `identify` envía email y nombre a PostHog (encargado de tratamiento).
    // Sin consentimiento de analítica no debe enviarse ningún dato personal,
    // por lo que postponemos la identificación hasta que el usuario acepte.
    if (!hasAnalyticsConsent()) return;

    if (identifiedUserIdRef.current !== null) {
      posthog.reset();
    }

    const fullName = user.user_metadata?.full_name;
    posthog.identify(user.id, {
      ...(user.email !== undefined ? { email: user.email } : {}),
      ...(typeof fullName === 'string' ? { name: fullName } : {}),
    });
    identifiedUserIdRef.current = user.id;
  }, []);

  const refreshProfile = useCallback(
    async (userId: string, email: string | null = null): Promise<void> => {
      const currentProfile = await fetchProfile(userId, email);
      setProfile(currentProfile);
    },
    [],
  );

  const reloadProfile = useCallback(async (): Promise<void> => {
    const currentSession = sessionRef.current;
    if (currentSession?.user === undefined) return;
    await refreshProfile(currentSession.user.id, currentSession.user.email ?? null);
  }, [refreshProfile]);

  const handleAuthEvent = useCallback(
    (event: AuthChangeEvent, nextSession: Session | null): void => {
      switch (event) {
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
          setSession(nextSession);
          if (nextSession?.user !== undefined) {
            identifySession(nextSession);
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
          if (isPostHogEnabled && identifiedUserIdRef.current !== null) {
            posthog.reset();
          }
          identifiedUserIdRef.current = null;
          setSession(null);
          setProfile(null);
          break;
        default:
          break;
      }
    },
    [identifySession, refreshProfile],
  );

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session?.user !== undefined) {
        identifySession(data.session);
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
  }, [handleAuthEvent, identifySession, refreshProfile]);

  /**
   * Reintenta la identificación cuando el usuario otorga consentimiento.
   *
   * `identifySession` omite `identify()` mientras no hay consentimiento de
   * analítica (envía email y nombre). Si el usuario inicia sesión antes de
   * aceptar el banner, sin este listener la sesión quedaría anónima para
   * siempre, aunque la captura ya esté activada.
   */
  useEffect(() => {
    if (!isPostHogEnabled) return;

    const handleConsentChange = () => {
      // La captura debe estar activa antes de `identify()`; se sincroniza aquí
      // para no depender del orden de montaje de los hooks de la app.
      syncPostHogConsent();

      const currentSession = sessionRef.current;
      if (currentSession?.user !== undefined) {
        identifySession(currentSession);
      }
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
  }, [identifySession]);

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
       reloadProfile,
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
       reloadProfile,
     ],
   );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
