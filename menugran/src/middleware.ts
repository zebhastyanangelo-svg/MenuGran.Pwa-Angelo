import { auth } from "@/lib/auth-next";
import { NextResponse } from "next/server";

const API_401 = NextResponse.json(
  { error: "No autorizado" },
  { status: 401 }
);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;
  const pathname = nextUrl.pathname;

  const isApi = pathname.startsWith("/api/");

  // Paginas publicas (no requieren auth)
  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/admin-login" ||
    pathname === "/operator-login" ||
    pathname === "/superadmin-login" ||
    pathname === "/register" ||
    pathname === "/forgot-pin";

  if (isPublicPage) return;

  // POST /api/orders es abierto (el handler valida clientId internamente)
  const isApiOrderPost = isApi && pathname.startsWith("/api/orders") && req.method === "POST";
  if (isApiOrderPost) return;

  // --- Sin sesion ---
  if (!isLoggedIn) {
    return isApi ? API_401 : NextResponse.redirect(new URL("/login", nextUrl.origin));
  }

  // --- Con sesion: verificar rol por ruta ---
  const redirect = () =>
    isApi ? API_401 : NextResponse.redirect(new URL("/login", nextUrl.origin));

  const isPage = !isApi;

  // Superadmin solo en /superadmin o /sa
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/sa")) {
    if (role !== "SUPERADMIN") return redirect();
  }

  // Admin en /admin
  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN" && role !== "SUPERADMIN") return redirect();
  }

  // Operator en /operator
  if (pathname.startsWith("/operator")) {
    if (role !== "OPERATOR" && role !== "ADMIN" && role !== "SUPERADMIN") return redirect();
  }

  // Rider en /rider o /api/rider
  if (pathname.startsWith("/rider") || pathname.startsWith("/api/rider")) {
    if (role !== "RIDER") return redirect();
  }

  // Client en /client o GET /api/orders
  if (pathname.startsWith("/client") || (pathname.startsWith("/api/orders") && req.method === "GET")) {
    if (role !== "CLIENT" && role !== "ADMIN" && role !== "OPERATOR" && role !== "SUPERADMIN") return redirect();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
