import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CLIENT" | "OPERATOR" | "ADMIN" | "RIDER" | "SUPERADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "CLIENT" | "OPERATOR" | "ADMIN" | "RIDER" | "SUPERADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CLIENT" | "OPERATOR" | "ADMIN" | "RIDER" | "SUPERADMIN";
  }
}
