import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get("taski_session")?.value;

  let isValidSession = false;
  if (sessionCookie) {
    try {
      const decoded = decodeURIComponent(sessionCookie);
      const session = JSON.parse(decoded);
      if (session && session.token && session.workspaceId) {
        isValidSession = true;
      }
    } catch {}
  }

  // 1. Si el usuario visita la raíz (login) pero ya tiene sesión activa -> Auto-redirección instantánea a /taski
  if (pathname === "/") {
    if (isValidSession) {
      const taskiUrl = new URL("/taski", req.url);
      return NextResponse.redirect(taskiUrl);
    }
    return NextResponse.next();
  }

  // 2. Rutas protegidas que requieren llave de acceso verificada
  const isProtectedPath =
    pathname.startsWith("/taski") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/equipo") ||
    pathname.startsWith("/cliente");

  if (isProtectedPath) {
    if (!isValidSession) {
      const loginUrl = new URL("/", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/taski/:path*",
    "/admin/:path*",
    "/equipo/:path*",
    "/cliente/:path*",
  ],
};

