import { NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { isRouteEnabled } from "./lib/features";
import { isFounderUser } from "./lib/founder-migration";

const AUTH_DISABLED = process.env.AUTH_DISABLED === "true";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/recovery",
  "/privacy",
  "/terms",
  "/cookies",
  "/demo",
];

/** Logged-in users are redirected away from these paths only (not recovery flows). */
const AUTH_REDIRECT_IF_LOGGED_IN = ["/login", "/signup"];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function shouldRedirectLoggedInUser(pathname) {
  return AUTH_REDIRECT_IF_LOGGED_IN.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isStaticOrInternal(pathname) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/cron") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|css|woff2?)$/i.test(pathname)
  );
}

function isFounderOnlyPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isStaticOrInternal(pathname)) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);
  const isFounder = isFounderUser(user);

  if (isFounderOnlyPath(pathname) && !isFounder) {
    const fallback = user && !AUTH_DISABLED ? "/home" : "/login";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  if (!isRouteEnabled(pathname, { isFounder })) {
    const fallback = user && !AUTH_DISABLED ? "/home" : "/";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  if (pathname === "/auth/logout") {
    return supabaseResponse;
  }

  if (pathname === "/") {
    if (user && !AUTH_DISABLED) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return supabaseResponse;
  }

  if (isPublicPath(pathname)) {
    if (user && !AUTH_DISABLED && shouldRedirectLoggedInUser(pathname)) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  if (!AUTH_DISABLED && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
