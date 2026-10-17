import { auth } from "./auth";

export default auth((request) => {
  if (request.auth) return;

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.nextUrl);
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.href);
  return Response.redirect(loginUrl);
});

export const config = {
  matcher: ["/telemetry/:path*", "/api/telemetry", "/api/games"],
};
