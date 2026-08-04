export {};

type UserRole = "CUSTOMER" | "MERCHANT" | "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      phone?: string | null;
      cedula?: string | null;
    };
  }

  interface User {
    id: string;
    role: UserRole;
    phone?: string | null;
    cedula?: string | null;
  }
}

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      phone?: string | null;
      cedula?: string | null;
    };
  }

  interface User {
    id: string;
    role: UserRole;
    phone?: string | null;
    cedula?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    phone?: string | null;
    cedula?: string | null;
  }
}
