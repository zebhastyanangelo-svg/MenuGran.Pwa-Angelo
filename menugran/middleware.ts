import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";

export async function middleware(req: NextRequest) {
  const session = await auth();

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (!session || session.user?.role !== "ADMIN" && session.user?.role !== "SUPERADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect operator routes
  if (req.nextUrl.pathname.startsWith("/operator")) {
    if (!session || !["OPERATOR", "ADMIN", "SUPERADMIN"].includes(session.user?.role || "")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect rider routes
  if (req.nextUrl.pathname.startsWith("/rider")) {
    if (!session || !["RIDER", "ADMIN", "SUPERADMIN"].includes(session.user?.role || "")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect superadmin routes
  if (req.nextUrl.pathname.startsWith("/sa")) {
    if (!session || session.user?.role !== "SUPERADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/operator/:path*", "/rider/:path*", "/sa/:path*"],
};
