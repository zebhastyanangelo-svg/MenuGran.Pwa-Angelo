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
  merchant_name: string | null;
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
        .select(`
          id,
          full_name,
          email,
          ci,
          phone,
          role,
          created_at,
          merchants!owner_id ( name ),
          merchant_staff!user_id ( merchant:merchants ( name ) )
        `)
        .order('created_at', { ascending: false });

      if (queryError !== null) {
        throw new Error(queryError.message);
      }

      const mapped: SuperAdminUser[] = (data ?? []).map((row: any) => {
        let merchantName: string | null = null;
        // merchant_owner: merchants via owner_id (may be array)
        const merchants = row.merchants;
        if (Array.isArray(merchants) && merchants.length > 0 && merchants[0].name) {
          merchantName = merchants[0].name;
        } else if (merchants && typeof merchants === 'object' && merchants.name) {
          merchantName = merchants.name;
        }
        // merchant_staff: merchant_staff -> merchant
        if (!merchantName && row.merchant_staff && row.merchant_staff.length > 0) {
          const firstStaff = row.merchant_staff[0];
          if (firstStaff.merchant && firstStaff.merchant.name) {
            merchantName = firstStaff.merchant.name;
          }
        }
        // driver: could be linked via deliveries, but not modeled; leave null
        return {
          id: row.id,
          full_name: row.full_name,
          email: row.email,
          ci: row.ci,
          phone: row.phone,
          role: row.role,
          created_at: row.created_at,
          merchant_name: merchantName,
        } as SuperAdminUser;
      });

      return mapped;
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
