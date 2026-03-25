import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { locales, defaultLocale } from "./lib/i18n";
import { getRequiredPermissionForPath } from "./lib/menu-route-permissions";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

const PUBLIC_ROUTES = ["/login", "/logout"];

function permissionsCurrentUrl() {
  const base = (
    process.env.BACKEND_URL || "http://127.0.0.1:8000/api/v2/"
  ).replace(/\/$/, "");
  return `${base}/permissions/current/`;
}

async function fetchUserPermissionCodenames(
  accessToken: string,
): Promise<string[] | null> {
  try {
    const res = await fetch(permissionsCurrentUrl(), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      error?: boolean;
      message?: { permissions?: string[] };
      success?: boolean;
      data?: { permissions?: string[] };
    };
    const list =
      body.message?.permissions ?? body.data?.permissions ?? undefined;
    if (!Array.isArray(list)) return null;
    return list;
  } catch {
    return null;
  }
}

function isPublicRoute(pathnameWithoutLocale: string) {
  return PUBLIC_ROUTES.some(
    (route) =>
      pathnameWithoutLocale === route ||
      pathnameWithoutLocale.startsWith(route + "/"),
  );
}

function clearAuthCookies(response: NextResponse) {
  [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
  ].forEach((name) => response.cookies.delete(name));
}

function getLocaleFromPathname(pathname: string) {
  const first = pathname.split("/")[1];
  if (first && (locales as readonly string[]).includes(first)) return first;
  return null;
}

export default async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  // If next-intl needs to redirect (e.g. / -> /en), do that first.
  if (intlResponse.headers.get("location")) return intlResponse;

  const { pathname } = request.nextUrl;
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return intlResponse;

  const pathnameWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const now = Math.floor(Date.now() / 1000);
  const exp =
    token && typeof (token as unknown as { exp?: unknown }).exp === "number"
      ? (token as unknown as { exp: number }).exp
      : undefined;
  const tokenErr = (token as Record<string, unknown> | null)?.error;
  const isAuthenticated =
    !!token &&
    (!exp || exp > now) &&
    tokenErr !== "RefreshAccessTokenError";

  // ✅ Logged-in user visiting /{locale}/login
  if (isAuthenticated && pathnameWithoutLocale.startsWith("/login")) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  // ❌ Not authenticated & protected route
  if (!isAuthenticated && !isPublicRoute(pathnameWithoutLocale)) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    clearAuthCookies(response);
    return response;
  }

  const forbiddenUrl = new URL(`/${locale}/forbidden`, request.url);
  const required = getRequiredPermissionForPath(pathnameWithoutLocale);
  if (
    isAuthenticated &&
    required &&
    !isPublicRoute(pathnameWithoutLocale)
  ) {
    const jwt = token as Record<string, unknown> | null;
    const accessToken =
      typeof jwt?.accessToken === "string" ? jwt.accessToken : "";
    if (!accessToken) {
      return NextResponse.redirect(forbiddenUrl);
    }
    const codenames = await fetchUserPermissionCodenames(accessToken);
    if (codenames === null) {
      return NextResponse.redirect(forbiddenUrl);
    }
    if (!codenames.includes(required)) {
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
