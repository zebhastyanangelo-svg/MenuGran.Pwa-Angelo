import { createContext } from 'react';
import type { PostgrestError, User } from '@supabase/supabase-js';
import type { ProfileRow, UserRole } from '../types/database';

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

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
  ) => Promise<SignUpResult>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface ProfileQueryResult {
  data: ProfileRow | null;
  error: PostgrestError | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
