import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { shouldRefreshToken } from "@/lib/auth-config";

// Helper function for direct backend API calls (not using server actions)
async function fetchBackend(
  endpoint: string,
  data: Record<string, string | boolean>,
  headers?: Record<string, string>,
) {
  const baseUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000/api/v2/";
  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      body: JSON.stringify(data),
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (jsonError) {
      // Handle non-JSON response
      const text = await response.text();
      console.error(
        "Backend returned non-JSON response:",
        text.substring(0, 200),
      );
      return {
        success: false,
        data: null,
        error: `Backend returned invalid JSON: ${text.substring(0, 100)}`,
        statusCode: response.status,
      };
    }

    return {
      success: response.ok,
      data: responseData,
      error:
        responseData.error ||
        responseData.message ||
        (response.ok ? undefined : "Request failed"),
      statusCode: response.status,
    };
  } catch (error) {
    console.error("Backend fetch error:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Network error",
      statusCode: 0,
    };
  }
}

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    error?: "RefreshAccessTokenError";
    user: {
      id: string;
      email: string;
      name?: string;
      first_name?: string;
      last_name?: string;

      error?: "RefreshAccessTokenError";
    };
  }

  interface User {
    id: string;
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    first_name?: string;
    last_name?: string;
    error?: "RefreshAccessTokenError";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number;
    user: {
      id: string;
      email: string;
      first_name?: string;
      last_name?: string;
    };
    error?: "RefreshAccessTokenError";
  }
}

// Guard to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<JWT> | null = null;

async function refreshAccessToken(token: JWT): Promise<JWT> {
  // If already refreshing, wait for the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Start refresh attempt
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      if (!token.refreshToken) {
        throw new Error("No refresh token available");
      }
      const res = await fetchBackend("auth/token/refresh/", {
        refresh: token.refreshToken,
      });

      if (!res.success) {
        throw new Error(res.error || "Refresh token error");
      }

      if (!res.data?.access) {
        throw new Error("No access token received");
      }

      // Decode the new access token to get expiration
      const payload = JSON.parse(atob(res.data.access.split(".")[1]));
      const expiresAt = payload.exp * 1000; // Convert to milliseconds

      return {
        ...token,
        accessToken: res.data.access,
        // Refresh token remains the same (Django may return new one in some implementations)
        // refreshToken: res.data.refresh || token.refreshToken,
        // Keep the original refresh token (ignore any rotated refresh token)
        refreshToken: token.refreshToken,
        expiresAt,
        error: undefined,
      };
    } catch (error) {
      return {
        ...token,
        error: "RefreshAccessTokenError",
        refreshToken: null, // Clear refresh token to prevent retries
      };
    } finally {
      // Reset refreshing state
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otpCode: { label: "OTP Code", type: "text", optional: true },
      },
      async authorize(credentials, req) {
        if (!credentials?.email) {
          throw new Error("Email is required");
        }

        // For OTP verification, password is not required
        if (!credentials?.otpCode && !credentials?.password) {
          throw new Error("Password or OTP code is required");
        }

        try {
          // Handle login with OTP flow
          if (!credentials.otpCode) {
            // Initial login - check if OTP is required
            const reqHeaders = (req as any)?.headers;
            const getHeader = (name: string) => {
              if (!reqHeaders) return "";
              if (typeof reqHeaders.get === "function")
                return reqHeaders.get(name) || "";
              const lower = name.toLowerCase();
              return reqHeaders[lower] || reqHeaders[name] || "";
            };
            const userAgent = getHeader("user-agent");
            const xForwardedFor = getHeader("x-forwarded-for");

            const loginResponse = await fetchBackend(
              "auth/login/",
              {
                email: credentials.email,
                password: credentials.password,
              },
              {
                ...(userAgent ? { "User-Agent": userAgent } : {}),
                ...(xForwardedFor ? { "X-Forwarded-For": xForwardedFor } : {}),
              },
            );

            console.log("loginResponse", loginResponse);

            if (!loginResponse.success) {
              throw new Error(
                loginResponse.data?.message ||
                loginResponse.error ||
                "Login failed",
              );
            }

            // Check if OTP is required
            if (loginResponse.data?.requires_otp) {
              // OTP required - throw special error to trigger OTP flow
              throw new Error(
                JSON.stringify({
                  requiresOtp: true,
                  waitSeconds: loginResponse.data.wait_seconds,
                  userId: loginResponse.data.user_id,
                  email: loginResponse.data.email,
                }),
              );
            }

            // Direct login successful (trusted device)
            if (loginResponse.data?.access && loginResponse.data?.refresh) {
              // Decode access token to get expiration
              const payload = JSON.parse(
                atob(loginResponse.data.access.split(".")[1]),
              );
              const expiresAt = payload.exp * 1000; // Convert to milliseconds

              return {
                id: loginResponse.data.user_id || credentials.email,
                email: credentials.email,
                accessToken: loginResponse.data.access,
                refreshToken: loginResponse.data.refresh,
                expiresAt,
                first_name: loginResponse.data.first_name,
                last_name: loginResponse.data.last_name,
              };
            }
          } else {
            // OTP verification flow - password not required
            const reqHeaders = (req as any)?.headers;
            const getHeader = (name: string) => {
              if (!reqHeaders) return "";
              if (typeof reqHeaders.get === "function")
                return reqHeaders.get(name) || "";
              const lower = name.toLowerCase();
              return reqHeaders[lower] || reqHeaders[name] || "";
            };
            const userAgent = getHeader("user-agent");
            const xForwardedFor = getHeader("x-forwarded-for");

            const otpResponse = await fetchBackend(
              "auth/verify-otp/",
              {
                email: credentials.email,
                otp_code: credentials.otpCode,
                remember_device: true,
              },
              {
                ...(userAgent ? { "User-Agent": userAgent } : {}),
                ...(xForwardedFor ? { "X-Forwarded-For": xForwardedFor } : {}),
              },
            );

            if (!otpResponse.success) {
              throw new Error(
                otpResponse.data?.message ||
                otpResponse.error ||
                "OTP verification failed",
              );
            }

            if (otpResponse.data?.access && otpResponse.data?.refresh) {
              // Decode access token to get expiration
              const payload = JSON.parse(
                atob(otpResponse.data.access.split(".")[1]),
              );
              const expiresAt = payload.exp * 1000; // Convert to milliseconds

              return {
                id: otpResponse.data.user_id || credentials.email,
                email: credentials.email,
                accessToken: otpResponse.data.access,
                refreshToken: otpResponse.data.refresh,
                expiresAt,
                first_name: otpResponse.data.first_name,
                last_name: otpResponse.data.last_name,
              };
            }
          }

          throw new Error("Invalid response from server");
        } catch (error: unknown) {
          // Check if this is an OTP required error
          try {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorData = JSON.parse(errorMessage);
            console.log("errorData", errorData);
            if (errorData.requiresOtp) {
              throw new Error(
                JSON.stringify({
                  requiresOtp: true,
                  ...errorData,
                }),
              );
            }
          } catch {
            // Not a JSON error, re-throw original error
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          expiresAt: user.expiresAt,
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          },
        };
      }

      // Handle session update
      if (trigger === "update" && session) {
        return {
          ...token,
          ...session,
        };
      }

      // Early return if refresh already failed - prevent infinite loop
      if (token.error === "RefreshAccessTokenError") {
        return {
          ...token,
          accessToken: null,
          refreshToken: null,
        };
      }

      // Check if token needs refresh using auth-config helper
      if (token.refreshToken && !token.error) {
        // Calculate expiresAt if not present (for backward compatibility)
        let expiresAt = token.expiresAt;
        if (!expiresAt && token.accessToken) {
          try {
            const payload = JSON.parse(atob(token.accessToken.split(".")[1]));
            expiresAt = payload.exp * 1000; // Convert to milliseconds
          } catch {
            // If we can't decode, assume token is invalid
            expiresAt = Date.now() - 1;
          }
        }

        if (expiresAt) {
          const needsRefresh = shouldRefreshToken(expiresAt / 1000); // Convert ms to seconds
          if (needsRefresh) {
            const refreshedToken = await refreshAccessToken(token);

            // If refresh failed, return token with error and clear refreshToken to prevent retries
            if (refreshedToken.error === "RefreshAccessTokenError") {
              return {
                ...token,
                error: "RefreshAccessTokenError",
                accessToken: null,
                refreshToken: null,
              };
            }

            return refreshedToken;
          }
        }
      }

      // If no refresh needed or no refresh token, return the token as is
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // If refresh token failed, return session with error to trigger logout
      if (token.error === "RefreshAccessTokenError") {
        return {
          ...session,
          user: {
            ...session.user,
            error: "RefreshAccessTokenError",
          },
          error: "RefreshAccessTokenError",
        };
      }

      if (token) {
        session.accessToken = token.accessToken || "";
        session.refreshToken = token.refreshToken || "";
        session.expiresAt = token.expiresAt;
        session.user = {
          ...session.user,
          id: token.user.id,
          email: token.user.email,
          name: `${token.user.first_name || ""} ${token.user.last_name || ""}`.trim(),
          first_name: token.user.first_name,
          last_name: token.user.last_name,
        };
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",
  debug: process.env.NODE_ENV === "development",
};

/**
 * Check if JWT token is expiring soon (within 5 minutes)
 * @deprecated Use shouldRefreshToken from auth-config.ts instead
 */
// @deprecated Use shouldRefreshToken from auth-config.ts instead
function isTokenExpiring(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return expiresAt - now < fiveMinutes;
  } catch {
    return false;
  }
}

/**
 * Helper to decode JWT token
 */
export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

// Export auth options for use in API route and server components

/**
 * Helper to get user's full name
 */
export function getUserFullName(session: Session | null): string {
  if (!session?.user) return "";

  const { first_name, last_name } = session.user;
  return `${first_name || ""} ${last_name || ""}`.trim();
}
