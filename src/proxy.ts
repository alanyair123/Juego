import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function proxy(req: NextRequest) {
  const session = await auth();
  if (session) return NextResponse.next();

  // APIs responden 401, páginas redirigen a /login
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
}

export const config = {
  matcher: ["/telemetry/:path*", "/api/telemetry/:path*", "/api/games/:path*"],
};