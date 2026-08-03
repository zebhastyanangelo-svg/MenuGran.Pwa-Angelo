import { auth } from "@/lib/auth-next";
import { NextResponse } from "next/server";

type Role = "CUSTOMER" | "ADMIN" | "EMPLOYEE" | "SUPER_ADMIN";

interface WithAuthOptions {
  requiredRole?: Role | Role[];
}

export async function withAuth(options?: WithAuthOptions) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  if (options?.requiredRole) {
    const roles = Array.isArray(options.requiredRole)
      ? options.requiredRole
      : [options.requiredRole];

    if (!roles.includes(session.user.role as Role)) {
      return NextResponse.json(
        { error: "No tienes permisos para acceder a este recurso" },
        { status: 403 }
      );
    }
  }

  return session;
}
