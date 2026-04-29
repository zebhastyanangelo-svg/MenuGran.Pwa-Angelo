import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";

export const authOptions: NextAuthOptions = {
  // Configure your auth options
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
