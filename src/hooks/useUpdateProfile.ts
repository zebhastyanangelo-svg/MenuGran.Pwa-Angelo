import { useCallback, useState } from 'react';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { ProfileRow } from '../types/database';

export interface ProfileUpdatePayload {
  full_name?: string;
  ci?: string;
  phone?: string;
}

export interface UseUpdateProfileResult {
  updateProfile: (userId: string, payload: ProfileUpdatePayload) => Promise<ProfileRow>;
  isSaving: boolean;
  error: string | null;
}

async function checkCiUnique(ci: string, excludeUserId: string): Promise<void> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.profiles)
    .select('id')
    .eq('ci', ci)
    .neq('id', excludeUserId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }
  if (data && data.length > 0) {
    throw new Error('La Cédula de Identidad ya está registrada en otro perfil.');
  }
}

export function useUpdateProfile(): UseUpdateProfileResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(
    async (userId: string, payload: ProfileUpdatePayload): Promise<ProfileRow> => {
      setIsSaving(true);
      setError(null);
      try {
        // Validate CI uniqueness if provided
        if (payload.ci !== undefined && payload.ci !== '') {
          await checkCiUnique(payload.ci, userId);
        }

        const { data, error: updateError } = await supabase
          .from(TABLE_NAMES.profiles)
          .update({
            ...(payload.full_name !== undefined && { full_name: payload.full_name }),
            ...(payload.ci !== undefined && { ci: payload.ci }),
            ...(payload.phone !== undefined && { phone: payload.phone }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single();

        if (updateError !== null) {
          throw new Error(updateError.message);
        }

        return data as ProfileRow;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar el perfil';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return { updateProfile, isSaving, error };
}
