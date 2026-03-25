// store/dev-tools.ts
import { atom } from "jotai";

// Token monitor visibility
export const tokenMonitorVisibleAtom = atom(false);

// Token refresh state
export const tokenRefreshStateAtom = atom<{
  isRefreshing: boolean;
  lastRefresh: Date | null;
  refreshCount: number;
  error: string | null;
}>({
  isRefreshing: false,
  lastRefresh: null,
  refreshCount: 0,
  error: null,
});

// Network simulation state
export const networkSimulationAtom = atom<{
  mode: "slow" | "error" | "server" | "timeout" | null;
  isActive: boolean;
}>({
  mode: null,
  isActive: false,
});

// Token information
export const tokenInfoAtom = atom<{
  accessToken: string | null;
  refreshToken: string | null;
  accessExpiresAt: number | null;
  refreshExpiresAt: number | null;
  isValid: boolean;
  timeLeft: {
    access: string;
    refresh: string;
  };
}>({
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

// Development tools preferences
export const devToolsPreferencesAtom = atom<{
  autoRefresh: boolean;
  showDebugInfo: boolean;
  logLevel: "minimal" | "normal" | "verbose";
  position: { x: number; y: number };
}>({
  autoRefresh: true,
  showDebugInfo: false,
  logLevel: "normal",
  position: { x: 0, y: 0 },
});

// Token refresh actions
export const refreshTokenAtom = atom(null, async (get, set) => {
  const currentState = get(tokenRefreshStateAtom);

  if (currentState.isRefreshing) {
    return;
  }

  set(tokenRefreshStateAtom, {
    ...currentState,
    isRefreshing: true,
    error: null,
  });

  try {
    // This would call the actual refresh function
    // For now, we'll simulate it
    await new Promise((resolve) => setTimeout(resolve, 1000));

    set(tokenRefreshStateAtom, {
      isRefreshing: false,
      lastRefresh: new Date(),
      refreshCount: currentState.refreshCount + 1,
      error: null,
    });
  } catch (error) {
    set(tokenRefreshStateAtom, {
      ...currentState,
      isRefreshing: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Force token expiry
export const forceTokenExpiryAtom = atom(null, (get, set) => {
  const currentTokenInfo = get(tokenInfoAtom);

  set(tokenInfoAtom, {
    ...currentTokenInfo,
    accessExpiresAt: Math.floor(Date.now() / 1000) - 1,
    isValid: false,
    timeLeft: {
      ...currentTokenInfo.timeLeft,
      access: "Expired",
    },
  });
});

// Reset all token state
export const resetTokenStateAtom = atom(null, (get, set) => {
  set(tokenRefreshStateAtom, {
    isRefreshing: false,
    lastRefresh: null,
    refreshCount: 0,
    error: null,
  });

  set(networkSimulationAtom, {
    mode: null,
    isActive: false,
  });
});

// Network simulation actions
export const simulateNetworkAtom = atom(
  null,
  (get, set, mode: "slow" | "error" | "server" | "timeout") => {
    set(networkSimulationAtom, {
      mode,
      isActive: true,
    });

    // Auto-reset after 3 seconds
    setTimeout(() => {
      set(networkSimulationAtom, {
        mode: null,
        isActive: false,
      });
    }, 3000);
  },
);
