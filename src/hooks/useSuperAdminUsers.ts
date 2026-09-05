import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { UserRole } from '../types/database';

export interface SuperAdminUser {
  id: string;
  full_name: string | null;
  email: string;
  ci: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

interface UseSuperAdminUsersResult {
  users: SuperAdminUser[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

function matchesSearch(user: SuperAdminUser, query: string): boolean {
  if (query.trim() === '') return true;
  const lower = query.toLowerCase();
  return (
    (user.full_name?.toLowerCase().includes(lower) ?? false) ||
    user.email.toLowerCase().includes(lower) ||
    (user.ci?.toLowerCase().includes(lower) ?? false)
  );
}

export function useSuperAdminUsers(): UseSuperAdminUsersResult {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: allUsers,
    isLoading,
    isError,
    error,
  } = useQuery<SuperAdminUser[], Error>({
    queryKey: ['superAdminUsers'],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from(TABLE_NAMES.profiles)
        .select('id, full_name, email, ci, phone, role, created_at')
        .order('created_at', { ascending: false });

      if (queryError !== null) {
        throw new Error(queryError.message);
      }

      return (data ?? []) as SuperAdminUser[];
    },
  });

  const users = useMemo(
    () => (allUsers ?? []).filter((user) => matchesSearch(user, searchQuery)),
    [allUsers, searchQuery],
  );

  return {
    users,
    isLoading,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
    searchQuery,
    setSearchQuery,
  };
}

export default useSuperAdminUsers;
