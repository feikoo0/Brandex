import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas protegidas que requieren llave de acceso verificada
  const isProtectedPath =
    pathname.startsWith("/taski") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/equipo") ||
    pathname.startsWith("/cliente");

  if (isProtectedPath) {
    const sessionCookie = req.cookies.get("taski_session")?.value;

    if (!sessionCookie) {
      const loginUrl = new URL("/", req.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const decoded = decodeURIComponent(sessionCookie);
      const session = JSON.parse(decoded);
      if (!session || !session.token || !session.workspaceId) {
        const loginUrl = new URL("/", req.url);
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      const loginUrl = new URL("/", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/taski/:path*",
    "/admin/:path*",
    "/equipo/:path*",
    "/cliente/:path*",
  ],
};
