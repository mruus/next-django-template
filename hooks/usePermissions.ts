'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import * as React from "react";
import { useSession } from "next-auth/react";
import { useAtom } from "jotai";
import {
  permissionsAtom,
  permissionsVersionAtom,
  permissionsSourceAtom,
} from "@/atoms/menu";

interface PermissionsState {
  permissions: string[];
  version: number | null;
  source: "ws" | "api" | null;
}

interface UsePermissionsReturn {
  permissions: string[];
  version: number | null;
  source: "ws" | "api" | null;
  canConnect: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  hasError: boolean;
  retryConnection: () => void;
}

export function usePermissions(): UsePermissionsReturn {
  const { data: session } = useSession();
  const [storedPermissions, setStoredPermissions] = useAtom(permissionsAtom);
  const [storedVersion, setStoredVersion] = useAtom(permissionsVersionAtom);
  const [storedSource, setStoredSource] = useAtom(permissionsSourceAtom);

  const accessToken = session?.accessToken;
  const canConnect = Boolean(accessToken);

  const [state, setState] = useState<PermissionsState>({
    permissions: storedPermissions,
    version: storedVersion,
    source: storedSource,
  });

  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const versionRef = useRef<number | null>(storedVersion);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFromAPI = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    try {
      const protocol =
        window.location.protocol === "https:" ? "https:" : "http:";
      const hostname = window.location.hostname;
      const backendPort = window.location.port === "3000" ? "8000" : window.location.port;
      const backendHost = backendPort ? `${hostname}:${backendPort}` : hostname;
      const apiUrl = `${protocol}//${backendHost}/api/v2/permissions/current/`;

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(apiUrl, {
        credentials: "include",
        headers,
      });
      const data = await res.json();

      if (data.success) {
        versionRef.current = data.data.version;
        setState({
          permissions: data.data.permissions,
          version: data.data.version,
          source: "api",
        });
        setHasError(false);
      }
    } catch (err) {
      setHasError(true);
    }
  }, [accessToken]);

  const connectWebSocket = useCallback(() => {
    if (!accessToken) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setHasError(false);

    // Determine WebSocket URL based on current host
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;
    const backendPort = window.location.port === "3000" ? "8000" : window.location.port;
    const backendHost = backendPort ? `${hostname}:${backendPort}` : hostname;

    const tokenQuery = accessToken
      ? `?token=${encodeURIComponent(accessToken)}`
      : "";
    const wsUrl = `${protocol}//${backendHost}/ws/permissions/${tokenQuery}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnecting(false);
      setIsConnected(true);
      setHasError(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // If version hasn't changed, do nothing
        if (
          data.type === "update" &&
          versionRef.current !== null &&
          data.version === versionRef.current
        ) {
          return;
        }

        // Version changed or initial load — update state
        versionRef.current = data.version;
        setState({
          permissions: data.permissions,
          version: data.version,
          source: "ws",
        });
        setHasError(false);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = () => {
      setIsConnecting(false);
      setIsConnected(false);
      setHasError(true);
      fetchFromAPI();
    };

    ws.onclose = (event) => {
      setIsConnecting(false);
      setIsConnected(false);

      // Only attempt reconnect if it wasn't a normal closure
      if (event.code !== 1000) {
        setHasError(true);

        // Clear any existing timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };
  }, [fetchFromAPI, accessToken]);

  const retryConnection = useCallback(() => {
    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Start new connection
    connectWebSocket();
  }, [connectWebSocket]);

  useEffect(() => {
    if (!accessToken) {
      // Keep status clean while auth session is not ready yet.
      setIsConnecting(false);
      setIsConnected(false);
      setHasError(false);
      return;
    }

    connectWebSocket();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket, accessToken]);

  useEffect(() => {
    setStoredPermissions(state.permissions);
    setStoredVersion(state.version);
    setStoredSource(state.source);
  }, [
    state.permissions,
    state.version,
    state.source,
    setStoredPermissions,
    setStoredVersion,
    setStoredSource,
  ]);

  return {
    permissions: state.permissions,
    version: state.version,
    source: state.source,
    canConnect,
    isConnecting,
    isConnected,
    hasError,
    retryConnection,
  };
}



// Helper hook for checking specific permissions
export function useHasPermission(permission: string): boolean {
  const { permissions } = usePermissions();
  return permissions.includes(permission);
}

// Helper hook for checking multiple permissions
export function useHasPermissions(requiredPermissions: string[]): boolean {
  const { permissions } = usePermissions();
  return requiredPermissions.every(permission => permissions.includes(permission));
}

// Helper hook for checking any of multiple permissions
export function useHasAnyPermission(possiblePermissions: string[]): boolean {
  const { permissions } = usePermissions();
  return possiblePermissions.some(permission => permissions.includes(permission));
}
