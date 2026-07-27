import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPin } from "@/lib/crypto";

type Role = "CLIENT" | "ADMIN" | "OPERATOR" | "RIDER" | "SUPERADMIN";

export const { handlers, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        cedula: { label: "Cédula", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.cedula || !credentials?.pin) return null;

        const user = await prisma.user.findUnique({
          where: { cedula: credentials.cedula as string },
        });

        if (!user || !user.active) return null;

        const pinOk = await verifyPin(credentials.pin as string, user.pin || "");
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
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role || "CLIENT";
        token.cedula = (user as { cedula: string | null }).cedula ?? null;
        token.phone = (user as { phone: string | null }).phone ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id = token.id as string;
        u.role = (token.role as Role) || "CLIENT";
        u.cedula = (token.cedula as string | null) ?? null;
        u.phone = (token.phone as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
