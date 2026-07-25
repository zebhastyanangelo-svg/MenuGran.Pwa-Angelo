import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPin } from "@/lib/crypto";

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
          role: user.role as "CLIENT" | "ADMIN" | "OPERATOR" | "RIDER" | "SUPERADMIN",
          cedula: user.cedula,
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "CLIENT";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
