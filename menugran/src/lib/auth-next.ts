import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth/next';
import type { NextApiRequest, NextApiResponse } from 'next';

// AuthOptions: minimal shape covering the fields we configure.
// The project is on next-auth@4.24.15 which lacks a stable AuthOptions export;
// this avoids forcing a non-existent type import.
interface AuthOptions {
  providers: ReturnType<typeof CredentialsProvider>[];
  session?: { strategy: 'jwt' | 'database' };
  callbacks?: {
    jwt?: (params: { token: Record<string, unknown>; user?: Record<string, unknown> }) => Promise<Record<string, unknown>> | Record<string, unknown>;
    session?: (params: { session: Record<string, unknown>; token: Record<string, unknown> }) => Promise<Record<string, unknown>> | Record<string, unknown>;
  };
  pages?: { signIn?: string };
}

// next-auth v4: NextAuth returns a function handler.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextAuthCallable = NextAuth as unknown as (options: AuthOptions) => (req: NextApiRequest, res: NextApiResponse) => unknown;
import { prisma } from '@/lib/db';
import { verifyPin } from '@/lib/crypto';

type Role = 'CLIENT' | 'ADMIN' | 'OPERATOR' | 'RIDER' | 'SUPERADMIN';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        cedula: { label: 'Cédula', type: 'text' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.cedula || !credentials?.pin) return null;

        const user = await prisma.user.findUnique({
          where: { cedula: credentials.cedula as string },
        });

        if (!user || !user.active) return null;

        const pinOk = await verifyPin(credentials.pin as string, user.pin || '');
        if (!pinOk) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as Role,
          cedula: user.cedula,
          phone: user.phone,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }: { token: Record<string, unknown>; user?: Record<string, unknown> }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role || 'CLIENT';
        token.cedula = (user as { cedula: string | null }).cedula ?? null;
        token.phone = (user as { phone: string | null }).phone ?? null;
      }
      return token;
    },
    async session({ session, token }: { session: Record<string, unknown>; token: Record<string, unknown> }) {
      if ((session as { user?: unknown }).user) {
        const u = (session as { user: Record<string, unknown> }).user;
        u.id = token.id as string;
        u.role = (token.role as Role) || 'CLIENT';
        u.cedula = (token.cedula as string | null) ?? null;
        u.phone = (token.phone as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

// next-auth v4: NextAuth returns a function handler; build GET/POST from it.
const handler = nextAuthCallable(authOptions);

// `auth()` helper: invokes getServerSession (v4 compatible).
// Cast through any because v4's strict GetServerSessionParams union doesn't
// accept a bare options object in some TS versions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function auth(): Promise<any> {
  return getServerSession(authOptions as any);
}

export const handlers = { GET: handler, POST: handler };
