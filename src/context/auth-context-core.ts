import { createContext } from 'react';
import type { PostgrestError, User } from '@supabase/supabase-js';
import type { ProfileRow, UserRole } from '../types/database';

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

export interface SignUpDetails {
  ci: string;
  phone: string;
}

export interface CompleteRegistrationInput {
  fullName: string;
  ci: string;
  phone: string;
}

export interface AuthContextValue {
  user: User | null;
  profile: ProfileRow | null;
  isLoading: boolean;
  signInWithGoogle: (redirectPath?: string | null) => Promise<void>;
  linkGoogleIdentity: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    details?: SignUpDetails,
  ) => Promise<SignUpResult>;
  completeRegistration: (input: CompleteRegistrationInput) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

export interface ProfileQueryResult {
  data: ProfileRow | null;
  error: PostgrestError | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
