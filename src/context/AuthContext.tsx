import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { ProfileRow, UserRole } from '../types/database';

export interface AuthContextValue {
  user: User | null;
  profile: ProfileRow | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

interface ProfileQueryResult {
  data: ProfileRow | null;
  error: PostgrestError | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Consulta el perfil del usuario en la tabla public.profiles.
 *
 * Devuelve `null` si el perfil no existe o la consulta falla (p. ej. por
 * una política RLS), sin propagar la excepción.
 */
export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const result = (await supabase
    .from(TABLE_NAMES.profiles)
    .select('*')
    .eq('id', userId)
    .single()) as unknown as ProfileQueryResult;

  if (result.error !== null) {
    console.error('Error al consultar el perfil del usuario', result.error);
    return null;
  }
  return result.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async (userId: string): Promise<void> => {
    const currentProfile = await fetchProfile(userId);
    setProfile(currentProfile);
  }, []);

  const handleAuthEvent = useCallback(
    (event: AuthChangeEvent, nextSession: Session | null): void => {
      switch (event) {
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
          setSession(nextSession);
          if (nextSession?.user !== undefined) {
            void refreshProfile(nextSession.user.id);
          }
          break;
        case 'TOKEN_REFRESHED':
          setSession(nextSession);
          break;
        case 'USER_UPDATED':
          setSession(nextSession);
          if (nextSession?.user !== undefined) {
            void refreshProfile(nextSession.user.id);
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

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsLoading(false);
      if (data.session?.user !== undefined) {
        void refreshProfile(data.session.user.id);
      }
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

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error !== null) throw error;
    } catch (error) {
      console.error('Error al iniciar sesión con Google', error);
      throw error;
    }
  }, []);

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
    ): Promise<void> => {
      try {
        const { error } = await supabase.auth.signUp({
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
      } catch (error) {
        console.error('Error al registrar usuario con email y contraseña', error);
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
      signOut,
    }),
    [
      user,
      profile,
      isLoading,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
