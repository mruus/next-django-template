"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAtom } from "jotai";
import {
  tokenInfoAtom,
  tokenRefreshStateAtom,
  refreshTokenAtom,
  forceTokenExpiryAtom,
  resetTokenStateAtom,
  simulateNetworkAtom,
} from "@/atoms/dev-tools";
import { authConfig, getTokenExpirationInfo } from "@/lib/auth-config";
import { refreshTokenAction } from "@/actions/core/auth";

// Helper function to decode JWT token (using our existing method from auth.ts)
function decodeToken(token: string): any {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function useTokenMonitor() {
  const { data: session, update } = useSession();
  const [tokenInfo, setTokenInfo] = useAtom(tokenInfoAtom);
  const [refreshState, setRefreshState] = useAtom(tokenRefreshStateAtom);
  const [, refreshToken] = useAtom(refreshTokenAtom);
  const [, forceExpiry] = useAtom(forceTokenExpiryAtom);
  const [, resetState] = useAtom(resetTokenStateAtom);
  const [, simulateNetwork] = useAtom(simulateNetworkAtom);

  // Track previous access token to detect automatic refreshes
  const previousAccessTokenRef = useRef<string | null>(null);
  const previousAccessExpiresRef = useRef<number | null>(null);
  const isManualRefreshRef = useRef(false);
  const isAutoRefreshingRef = useRef(false);
  const lastUpdateAttemptRef = useRef<number>(0);

  // Copy state management
  const [copyState, setCopyState] = useState<{
    accessToken: "idle" | "copying" | "copied" | "error";
    refreshToken: "idle" | "copying" | "copied" | "error";
  }>({
    accessToken: "idle",
    refreshToken: "idle",
  });

  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return "Expired";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }, []);

  const updateTokenInfo = useCallback(() => {
    // Our session structure from auth.ts: session.accessToken, session.refreshToken, session.expiresAt
    if (!session?.accessToken || !session?.refreshToken) {
      setTokenInfo({
        accessToken: null,
        refreshToken: null,
        accessExpiresAt: null,
        refreshExpiresAt: null,
        isValid: false,
        timeLeft: {
          access: "N/A",
          refresh: "N/A",
        },
      });
      return;
    }

    try {
      const accessDecoded = decodeToken(session.accessToken);
      const refreshDecoded = decodeToken(session.refreshToken);

      if (!accessDecoded || !refreshDecoded) {
        throw new Error("Failed to decode tokens");
      }

      const accessExpires = accessDecoded.exp;
      const refreshExpires = refreshDecoded.exp;
      const currentAccessToken = session.accessToken;

      const previousToken = previousAccessTokenRef.current;
      const previousExpires = previousAccessExpiresRef.current;
      const tokenChanged =
        previousToken !== null &&
        previousToken !== currentAccessToken &&
        !isManualRefreshRef.current;

      if (tokenChanged) {
        setRefreshState((prev) => ({
          ...prev,
          lastRefresh: new Date(),
          refreshCount: prev.refreshCount + 1,
          error: null,
        }));
      }

      if (isManualRefreshRef.current && previousToken !== currentAccessToken) {
        isManualRefreshRef.current = false;
      }

      previousAccessTokenRef.current = currentAccessToken;
      previousAccessExpiresRef.current = accessExpires;

      // Use environment-aware token expiration info
      const accessInfo = getTokenExpirationInfo(accessExpires);
      const refreshInfo = getTokenExpirationInfo(refreshExpires);

      setTokenInfo({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        accessExpiresAt: accessExpires,
        refreshExpiresAt: refreshExpires,
        isValid: !accessInfo.isExpired,
        timeLeft: {
          access: formatTime(accessInfo.timeLeft),
          refresh: formatTime(refreshInfo.timeLeft),
        },
      });
    } catch (error) {
      console.error("Error decoding tokens:", error);
      setTokenInfo((prev) => ({
        ...prev,
        isValid: false,
        timeLeft: {
          ...prev.timeLeft,
          access: "Invalid",
        },
      }));
    }
  }, [session, setTokenInfo, formatTime, setRefreshState]);

  const handleRefresh = useCallback(async () => {
    if (refreshState.isRefreshing) return;

    try {
      // Mark as manual refresh to avoid double-counting
      isManualRefreshRef.current = true;

      // Simulate network delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Call the actual refresh using our refreshTokenAction
      if (session?.refreshToken) {
        const result = await refreshTokenAction(session.refreshToken);

        if (!result.success) {
          throw new Error(result.error || "Failed to refresh token");
        }

        // Update session with new tokens
        // Note: In a real implementation, this would trigger NextAuth to update the session
        // For now, we'll just update the local state
        await update();
      } else {
        throw new Error("No refresh token available");
      }

      setRefreshState((prev) => ({
        ...prev,
        lastRefresh: new Date(),
        refreshCount: prev.refreshCount + 1,
        error: null,
      }));
    } catch (error) {
      isManualRefreshRef.current = false;
      setRefreshState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      throw error;
    }
  }, [
    refreshState.isRefreshing,
    session?.refreshToken,
    update,
    setRefreshState,
  ]);

  const handleForceExpire = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    forceExpiry();
  }, [forceExpiry]);

  const handleForceLogout = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Use next-auth signOut like in horizontal.tsx and vertical.tsx
    signOut({ callbackUrl: "/login" });
  }, []);

  const handleReset = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    resetState();
  }, [resetState]);

  const handleSimulation = useCallback(
    async (mode: "slow" | "error" | "server" | "timeout") => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      simulateNetwork(mode);
    },
    [simulateNetwork],
  );

  const copyAccessToken = useCallback(async () => {
    if (!tokenInfo.accessToken) return;

    setCopyState((prev) => ({ ...prev, accessToken: "copying" }));

    try {
      await navigator.clipboard.writeText(tokenInfo.accessToken);
      setCopyState((prev) => ({ ...prev, accessToken: "copied" }));

      setTimeout(() => {
        setCopyState((prev) => ({ ...prev, accessToken: "idle" }));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy access token:", error);
      setCopyState((prev) => ({ ...prev, accessToken: "error" }));

      setTimeout(() => {
        setCopyState((prev) => ({ ...prev, accessToken: "idle" }));
      }, 3000);
    }
  }, [tokenInfo.accessToken]);

  const copyRefreshToken = useCallback(async () => {
    if (!tokenInfo.refreshToken) return;

    setCopyState((prev) => ({ ...prev, refreshToken: "copying" }));

    try {
      await navigator.clipboard.writeText(tokenInfo.refreshToken);
      setCopyState((prev) => ({ ...prev, refreshToken: "copied" }));

      setTimeout(() => {
        setCopyState((prev) => ({ ...prev, refreshToken: "idle" }));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy refresh token:", error);
      setCopyState((prev) => ({ ...prev, refreshToken: "error" }));

      setTimeout(() => {
        setCopyState((prev) => ({ ...prev, refreshToken: "idle" }));
      }, 3000);
    }
  }, [tokenInfo.refreshToken]);

  // Update token info every second and force session refresh when expired or about to expire
  useEffect(() => {
    updateTokenInfo();

    const interval = setInterval(() => {
      updateTokenInfo();

      // Only trigger refresh if token is expired or within refresh buffer time
      if (tokenInfo.accessExpiresAt) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = tokenInfo.accessExpiresAt - now;
        const bufferTime = authConfig.refreshBufferTime;
        const isExpired = timeUntilExpiry <= 0;
        const needsRefresh = timeUntilExpiry <= bufferTime;
        const timeSinceLastUpdate = Date.now() - lastUpdateAttemptRef.current;

        // Only attempt refresh if:
        // 1. Token is expired OR within buffer time (about to expire)
        // 2. We have a refresh token
        // 3. No error in session
        // 4. Not already refreshing
        // 5. At least 3 seconds since last update attempt
        if (
          needsRefresh &&
          session?.refreshToken &&
          !session?.error &&
          !isAutoRefreshingRef.current &&
          timeSinceLastUpdate > 3000
        ) {
          isAutoRefreshingRef.current = true;
          lastUpdateAttemptRef.current = Date.now();

          // Force session update - this will trigger NextAuth's JWT callback
          update()
            .then(() => {
              setTimeout(() => {
                isAutoRefreshingRef.current = false;
              }, 2000);
            })
            .catch((err) => {
              console.error("[TokenMonitor] Failed to update session:", err);
              isAutoRefreshingRef.current = false;
            });
        } else if (!needsRefresh && timeUntilExpiry > bufferTime) {
          // Token is valid and not near expiry, reset the flag
          isAutoRefreshingRef.current = false;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    updateTokenInfo,
    tokenInfo.accessExpiresAt,
    session?.refreshToken,
    session?.error,
    update,
  ]);

  return {
    tokenInfo,
    refreshState,
    copyState,
    handleRefresh,
    handleForceExpire,
    handleForceLogout,
    handleReset,
    handleSimulation,
    copyAccessToken,
    copyRefreshToken,
  };
}
