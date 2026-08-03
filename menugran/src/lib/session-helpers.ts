// Type helper for useSession() from next-auth/react.
// NextAuth v4's User default doesn't include id/role — this widens it for our app.

export type AppSessionUser = {
  id: string;
  role: 'CUSTOMER' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN';
  name?: string | null;
  email?: string | null;
  image?: string | null;
  phone?: string | null;
  cedula?: string | null;
};

export type AppSession = {
  user: AppSessionUser;
  expires: string;
} | null;

/**
 * Type-narrow a useSession() result into our app's augmented shape.
 * Safe because auth-next.ts always sets id + role in jwt/session callbacks.
 */
export function asAppSession(session: unknown): AppSession {
  if (!session || typeof session !== 'object') return null;
  const s = session as Record<string, unknown>;
  const user = s.user as Record<string, unknown> | undefined;
  if (!user || typeof user !== 'object' || typeof user.id !== 'string') return null;
  return {
    user: {
      id: user.id,
      role: (user.role as AppSessionUser['role']) || 'CUSTOMER',
      name: (user.name as string | null | undefined) ?? null,
      email: (user.email as string | null | undefined) ?? null,
      image: (user.image as string | null | undefined) ?? null,
      phone: (user.phone as string | null | undefined) ?? null,
      cedula: (user.cedula as string | null | undefined) ?? null,
    },
    expires: (s.expires as string) ?? '',
  };
}
