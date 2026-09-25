import { describe, expect, it } from 'vitest';

const migrationFiles = import.meta.glob('../../supabase/migrations/*.sql', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const migration = Object.entries(migrationFiles).find(([path]) =>
  path.includes('20260925052532_harden_rls_private_helpers'),
)?.[1] ?? '';

describe('RLS hardening migration', () => {
  it('moves internal authorization helpers out of the public schema', () => {
    expect(migration).toContain('CREATE SCHEMA IF NOT EXISTS private');
    expect(migration).toContain('REVOKE ALL ON SCHEMA private FROM PUBLIC, anon');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION private.is_merchant_owner');
    expect(migration).toContain('REVOKE ALL ON FUNCTION private.is_merchant_owner(uuid) FROM PUBLIC, anon');
  });

  it('restricts order and delivery policies to authenticated users', () => {
    expect(migration).toContain('CREATE POLICY orders_select_authorized ON public.orders');
    expect(migration).toContain('CREATE POLICY deliveries_select_authorized ON public.deliveries');
    expect(migration).toMatch(/CREATE POLICY orders_insert_customer[\s\S]*?TO authenticated/);
    expect(migration).not.toMatch(/CREATE POLICY[\s\S]*?\bTO public\b/);
  });

  it('removes diagnostic and old public helper execution surfaces', () => {
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.debug_merchant_owner_ids()');
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.guard_superadmin_role()');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.cleanup_old_payment_proofs() FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated');
  });
});
