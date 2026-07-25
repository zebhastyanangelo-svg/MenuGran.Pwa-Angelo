declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      role: "CLIENT" | "OPERATOR" | "ADMIN" | "RIDER" | "SUPERADMIN";
      name?: string | null;
      email?: string | null;
      image?: string | null;
      phone?: string | null;
      cedula?: string | null;
    };
  }

  interface User {
    id: string;
    role: "CLIENT" | "OPERATOR" | "ADMIN" | "RIDER" | "SUPERADMIN";
    phone?: string | null;
    cedula?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CLIENT" | "OPERATOR" | "ADMIN" | "RIDER" | "SUPERADMIN";
    phone?: string | null;
    cedula?: string | null;
  }
}
