// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ex.: /auth/next=%2Fapp  →  /auth?next=/app
  if (pathname.startsWith("/auth/next=")) {
    const nextParam = decodeURIComponent(pathname.replace("/auth/next=", "")) || "/app";
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", nextParam);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Opcional: limita onde roda
export const config = {
  matcher: ["/auth/:path*"],
};
