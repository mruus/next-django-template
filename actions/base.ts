"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  data?: Record<string, any> | FormData;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

const getBaseUrl = () => process.env.BACKEND_URL || "http://127.0.0.1:8000/api/v2/";

type Language = "en" | "so" | "ar";

function normalizeLanguage(value: string | null | undefined): Language | null {
  if (!value) return null;
  const lang = value.trim().toLowerCase().split(",")[0]?.split(";")[0] || "";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("so")) return "so";
  if (lang.startsWith("ar")) return "ar";
  return null;
}

async function getSelectedLanguage(): Promise<Language> {
  const c = await cookies();
  const h = await headers();

  const fromCookie =
    normalizeLanguage(c.get("NEXT_LOCALE")?.value) ||
    normalizeLanguage(c.get("next-intl-locale")?.value) ||
    normalizeLanguage(c.get("locale")?.value);

  const fromHeader = normalizeLanguage(h.get("accept-language"));

  return fromCookie || fromHeader || "en";
}

async function getDeviceInfo() {
  const h = await headers();
  const ua = h.get("user-agent") || "";
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;

  // Device info is now extracted server-side from request metadata
  // We only need to pass the basic headers that Django expects
  return {
    userAgent: ua,
    ipAddress: ip,
  };
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { getServerSession } = await import("next-auth");
    const { authConfig } = await import("@/lib/auth");
    return (await getServerSession(authConfig))?.accessToken || null;
  } catch {
    return null;
  }
}

export async function apiRequest<T = any>(
  options: RequestOptions,
): Promise<ApiResponse<T>> {
  try {
    const {
      method,
      url,
      data,
      headers: customHeaders = {},
      requiresAuth = true,
      cache = "default",
      next = {},
    } = options;
    const deviceInfo = await getDeviceInfo();
    const authToken = requiresAuth ? await getAuthToken() : null;
    const selectedLanguage = await getSelectedLanguage();

    if (requiresAuth && !authToken) {
      redirect("/logout");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": deviceInfo.userAgent,
      ...customHeaders,
    };
    headers["Accept-Language"] = headers["Accept-Language"] || selectedLanguage;
    if (deviceInfo.ipAddress) {
      headers["X-Forwarded-For"] = deviceInfo.ipAddress;
    }

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    let body: string | FormData | undefined;
    if (data) {
      if (data instanceof FormData) {
        body = data;
        delete headers["Content-Type"];
      } else {
        body = JSON.stringify(data);
      }
    }
    const response = await fetch(`${getBaseUrl()}${url}`, {
      method,
      headers,
      body,
      cache,
      next,
    });

    // ⬇️ If backend returns 401 → redirect
    if (response.status === 401) {
      redirect("/logout");
    }

    const responseData = await response.json().catch(() => null);
    if (!response.ok)
      return {
        success: false,
        error:
          responseData?.message ||
          responseData?.error ||
          `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      };
    return { success: true, data: responseData, statusCode: response.status };
  } catch (error) {
    // ⬇️ Important: let Next.js redirect errors pass through
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network request failed",
      statusCode: 500,
    };
  }
}

export async function apiGet<T = any>(
  url: string,
  options?: Omit<RequestOptions, "method" | "url"> & {
    params?: Record<string, string | number | undefined>;
  },
) {
  let finalUrl = url;

  if (options?.params) {
    const search = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        search.set(key, String(value));
      }
    });
    finalUrl = `${url}?${search.toString()}`;
  }

  return apiRequest<T>({
    method: "GET",
    url: finalUrl,
    ...options,
  });
}

export async function apiPost<T = any>(
  url: string,
  data?: any,
  options?: Omit<RequestOptions, "method" | "url" | "data">,
) {
  return apiRequest<T>({ method: "POST", url, data, ...options });
}

export async function apiPut<T = any>(
  url: string,
  data?: any,
  options?: Omit<RequestOptions, "method" | "url" | "data">,
) {
  return apiRequest<T>({ method: "PUT", url, data, ...options });
}

export async function apiPatch<T = any>(
  url: string,
  data?: any,
  options?: Omit<RequestOptions, "method" | "url" | "data">,
) {
  return apiRequest<T>({ method: "PATCH", url, data, ...options });
}

export async function apiDelete<T = any>(
  url: string,
  options?: Omit<RequestOptions, "method" | "url">,
) {
  return apiRequest<T>({ method: "DELETE", url, ...options });
}
