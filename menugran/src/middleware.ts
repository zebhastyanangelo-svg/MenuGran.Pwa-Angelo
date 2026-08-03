import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const API_401 = NextResponse.json(
  { error: 'No autorizado' },
  { status: 401 }
);

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  // getToken es Edge-safe (next-auth/next no lo es). El JWT guarda role/id
  // directamente via el callback jwt de auth-next.ts.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token?.role;
  const role = token?.role as string | undefined;
  const pathname = nextUrl.pathname;

  const isApi = pathname.startsWith('/api/');

  // Paginas publicas (no requieren auth)
  const isPublicPage =
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/admin-login' ||
    pathname === '/operator-login' ||
    pathname === '/superadmin-login' ||
    pathname === '/register' ||
    pathname === '/forgot-pin';

  if (isPublicPage) return NextResponse.next();

  // POST /api/orders es abierto (el handler valida clientId internamente)
  const isApiOrderPost = isApi && pathname.startsWith('/api/orders') && req.method === 'POST';
  if (isApiOrderPost) return NextResponse.next();

  // --- Sin sesion ---
  if (!isLoggedIn) {
    return isApi ? API_401 : NextResponse.redirect(new URL('/login', nextUrl.origin));
  }

  // --- Con sesion: verificar rol por ruta ---
  const deny = () => (isApi ? API_401 : NextResponse.redirect(new URL('/login', nextUrl.origin)));

  // Superadmin solo en /superadmin o /sa
  if (pathname.startsWith('/superadmin') || pathname.startsWith('/sa')) {
    if (role !== 'SUPER_ADMIN') return deny();
  }

  // Admin en /admin
  if (pathname.startsWith('/admin')) {
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return deny();
  }

  // Operator en /operator
  if (pathname.startsWith('/operator')) {
    if (role !== 'EMPLOYEE' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') return deny();
  }

  // Rider en /rider o /api/rider
  if (pathname.startsWith('/rider') || pathname.startsWith('/api/rider')) {
    if (role !== 'EMPLOYEE') return deny();
  }

  // Merchant en /merchant-portal
  if (pathname.startsWith('/merchant-portal')) {
    if (role !== 'MERCHANT' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') return deny();
  }

  // Client en /client o GET /api/orders
  if (pathname.startsWith('/client') || (pathname.startsWith('/api/orders') && req.method === 'GET')) {
    if (role !== 'CUSTOMER' && role !== 'ADMIN' && role !== 'EMPLOYEE' && role !== 'SUPER_ADMIN') return deny();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};