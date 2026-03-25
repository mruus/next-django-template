"use client";

import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Wifi,
  WifiOff,
  Server,
  Timer,
  Copy,
  Check,
} from "lucide-react";
import { useTokenMonitor } from "@/hooks/dev-tools/useTokenMonitor";
import { tokenMonitorVisibleAtom } from "@/atoms/dev-tools";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { authConfig } from "@/lib/auth-config";
import { useTheme } from "next-themes";

export function TokenMonitor() {
  const [isVisible, setIsVisible] = useAtom(tokenMonitorVisibleAtom);
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme || "light";
  const pathname = usePathname();
  const [actionStates, setActionStates] = useState<{
    refresh: boolean;
    expire: boolean;
    logout: boolean;
    reset: boolean;
    slow: boolean;
    error: boolean;
    server: boolean;
    timeout: boolean;
  }>({
    refresh: false,
    expire: false,
    logout: false,
    reset: false,
    slow: false,
    error: false,
    server: false,
    timeout: false,
  });
  const [actionMessage, setActionMessage] = useState<string>("");
  const [showMessage, setShowMessage] = useState<boolean>(false);

  const {
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
  } = useTokenMonitor();

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  // Don't show on auth pages (login, verify-otp, etc.)
  const isAuthPage =
    pathname?.startsWith("/login") || pathname?.startsWith("/logout");

  if (isAuthPage) {
    return null;
  }

  const getTokenStatus = (
    timeLeft: string,
    isValid: boolean,
    expiresAt: number | null,
  ) => {
    if (!isValid || timeLeft === "N/A")
      return { color: "destructive" as const, icon: XCircle, warning: true };
    if (timeLeft === "Expired")
      return { color: "destructive" as const, icon: XCircle, warning: true };

    // Check if token is within buffer time (about to expire)
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      const bufferTime = authConfig.refreshBufferTime;

      if (timeUntilExpiry <= bufferTime && timeUntilExpiry > 0) {
        return {
          color: "secondary" as const,
          icon: AlertTriangle,
          warning: true,
        };
      }
    }

    // Check if only seconds remaining (for short-lived tokens)
    if (
      timeLeft.includes("s") &&
      !timeLeft.includes("m") &&
      !timeLeft.includes("h") &&
      !timeLeft.includes("d")
    ) {
      // Extract the number of seconds from strings like "45s" or "5s"
      const match = timeLeft.match(/(\d+)s/);
      if (match) {
        const seconds = parseInt(match[1]);
        if (seconds <= 30)
          return {
            color: "destructive" as const,
            icon: AlertTriangle,
            warning: true,
          };
        if (seconds <= 60)
          return {
            color: "secondary" as const,
            icon: AlertTriangle,
            warning: true,
          };
      }
    }

    return { color: "default" as const, icon: CheckCircle, warning: false };
  };

  const showActionFeedback = (message: string, duration: number = 3000) => {
    setActionMessage(message);
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
      setActionMessage("");
    }, duration);
  };

  const handleActionWithFeedback = async (
    action: () => Promise<void> | void,
    actionKey: keyof typeof actionStates,
    successMessage: string,
    loadingMessage: string,
  ) => {
    if (actionStates[actionKey]) return; // Prevent multiple clicks

    setActionStates((prev) => ({ ...prev, [actionKey]: true }));
    showActionFeedback(loadingMessage, 1000);

    try {
      await action();
      showActionFeedback(successMessage);
    } catch (error) {
      showActionFeedback(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        5000,
      );
    } finally {
      setActionStates((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        size="sm"
        variant="outline"
        className={`fixed bottom-4 right-4 z-50 ${theme === "dark" ? "text-white bg-blue-600 border-blue-600 hover:bg-blue-700" : "text-white bg-blue-600 border-blue-600 hover:bg-blue-700"}`}
      >
        <Settings className="w-4 h-4" />
        Dev Tools
      </Button>
    );
  }

  const accessStatus = getTokenStatus(
    tokenInfo.timeLeft.access,
    tokenInfo.isValid,
    tokenInfo.accessExpiresAt,
  );
  const refreshStatus = getTokenStatus(
    tokenInfo.timeLeft.refresh,
    true,
    tokenInfo.refreshExpiresAt,
  );

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "Expired";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const isDarkMode = theme === "dark";
  console.log("Is Dark Mode", isDarkMode, resolvedTheme);

  return (
    <div className="fixed right-4 bottom-4 z-50 w-80">
      <Card
        className={`${isDarkMode ? "text-white bg-gray-900 border-gray-700" : "text-black bg-white border-gray-200"} shadow-lg transition-colors duration-200 backdrop-blur-sm bg-opacity-95`}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex gap-2 items-center text-sm font-medium">
              <Settings className="w-4 h-4" />
              Token Monitor (Dev Only)
            </CardTitle>
            <Button
              onClick={() => setIsVisible(false)}
              size="sm"
              variant="ghost"
              className={`h-6 w-6 p-0 ${isDarkMode ? "text-white hover:text-white hover:bg-gray-800" : "text-black hover:text-black hover:bg-gray-100"} transition-colors duration-200 rounded-full`}
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Token Status */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span>Access Token:</span>
              <div className="flex gap-2 items-center">
                <Badge variant={accessStatus.color} className="text-xs">
                  <accessStatus.icon className="mr-1 w-3 h-3" />
                  {tokenInfo.isValid ? "Valid" : "Invalid"}
                </Badge>
                <Button
                  onClick={copyAccessToken}
                  disabled={
                    !tokenInfo.accessToken ||
                    copyState.accessToken === "copying"
                  }
                  size="sm"
                  variant="ghost"
                  className={`p-0 w-5 h-5 ${isDarkMode ? "text-white hover:bg-gray-800" : "text-black hover:bg-gray-100"} rounded transition-colors duration-200`}
                >
                  {copyState.accessToken === "copied" ? (
                    <Check
                      className={`w-3 h-3 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
                    />
                  ) : copyState.accessToken === "error" ? (
                    <XCircle
                      className={`w-3 h-3 ${isDarkMode ? "text-red-400" : "text-red-600"}`}
                    />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span>Expires in:</span>
              <span
                className={`font-mono ${accessStatus.warning ? (isDarkMode ? "text-red-400" : "text-red-600") + " font-bold animate-pulse" : ""}`}
              >
                {tokenInfo.timeLeft.access}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span>Refresh Token:</span>
              <div className="flex gap-2 items-center">
                <Badge variant={refreshStatus.color} className="text-xs">
                  <refreshStatus.icon className="mr-1 w-3 h-3" />
                  Valid
                </Badge>
                <Button
                  onClick={copyRefreshToken}
                  disabled={
                    !tokenInfo.refreshToken ||
                    copyState.refreshToken === "copying"
                  }
                  size="sm"
                  variant="ghost"
                  className={`p-0 w-5 h-5 ${isDarkMode ? "text-white hover:bg-gray-800" : "text-black hover:bg-gray-100"} rounded transition-colors duration-200`}
                >
                  {copyState.refreshToken === "copied" ? (
                    <Check
                      className={`w-3 h-3 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
                    />
                  ) : copyState.refreshToken === "error" ? (
                    <XCircle
                      className={`w-3 h-3 ${isDarkMode ? "text-red-400" : "text-red-600"}`}
                    />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span>Expires in:</span>
              <span
                className={`font-mono ${refreshStatus.warning ? (isDarkMode ? "text-red-400" : "text-red-600") + " font-bold animate-pulse" : ""}`}
              >
                {tokenInfo.timeLeft.refresh}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs opacity-60">
              <span>Refresh Buffer:</span>
              <span className="font-mono text-[10px]">
                {formatTime(authConfig.refreshBufferTime)}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div
            className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"} pt-2 space-y-1 transition-colors duration-200`}
          >
            <div className="flex justify-between items-center text-xs">
              <span>Last Refresh:</span>
              <span>
                {refreshState.lastRefresh
                  ? refreshState.lastRefresh.toLocaleTimeString()
                  : "Never"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span>Refresh Count:</span>
              <span>{refreshState.refreshCount}</span>
            </div>
            {refreshState.error && (
              <div
                className={`text-xs ${isDarkMode ? "text-red-400 bg-red-900/20" : "text-red-600 bg-red-50"} p-1 rounded transition-colors duration-200`}
              >
                Error: {refreshState.error}
              </div>
            )}
          </div>

          {/* Controls */}
          <div
            className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"} pt-2 space-y-2 transition-colors duration-200`}
          >
            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={() =>
                  handleActionWithFeedback(
                    handleRefresh,
                    "refresh",
                    "✅ Token refreshed successfully!",
                    "🔄 Refreshing token...",
                  )
                }
                disabled={actionStates.refresh || refreshState.isRefreshing}
                size="sm"
                variant="outline"
                className={`h-7 text-xs ${isDarkMode ? "border-gray-600 hover:bg-gray-800 text-white hover:text-white" : "border-gray-300 hover:bg-gray-100 text-black hover:text-black"}`}
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${actionStates.refresh || refreshState.isRefreshing ? "animate-spin" : ""}`}
                />
                {actionStates.refresh ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                onClick={() =>
                  handleActionWithFeedback(
                    handleForceExpire,
                    "expire",
                    "⏰ Access token expired!",
                    "⏰ Expiring token...",
                  )
                }
                disabled={actionStates.expire}
                size="sm"
                variant="outline"
                className={`h-7 text-xs ${isDarkMode ? "border-gray-600 hover:bg-gray-800 text-white hover:text-white" : "border-gray-300 hover:bg-gray-100 text-black hover:text-black"}`}
              >
                <Timer
                  className={`h-3 w-3 mr-1 ${actionStates.expire ? "animate-pulse" : ""}`}
                />
                {actionStates.expire ? "Expiring..." : "Expire"}
              </Button>
              <Button
                onClick={() =>
                  handleActionWithFeedback(
                    handleForceLogout,
                    "logout",
                    "🚪 Logged out successfully!",
                    "🚪 Logging out...",
                  )
                }
                disabled={actionStates.logout}
                size="sm"
                variant="outline"
                className={`h-7 text-xs ${isDarkMode ? "border-gray-600 hover:bg-gray-800 text-white hover:text-white" : "border-gray-300 hover:bg-gray-100 text-black hover:text-black"}`}
              >
                <LogOut
                  className={`h-3 w-3 mr-1 ${actionStates.logout ? "animate-pulse" : ""}`}
                />
                {actionStates.logout ? "Logging out..." : "Logout"}
              </Button>
              <Button
                onClick={() =>
                  handleActionWithFeedback(
                    handleReset,
                    "reset",
                    "📊 State reset successfully!",
                    "📊 Resetting state...",
                  )
                }
                disabled={actionStates.reset}
                size="sm"
                variant="outline"
                className={`h-7 text-xs ${isDarkMode ? "border-gray-600 hover:bg-gray-800 hover:text-white" : "border-gray-300 hover:bg-gray-100 hover:text-black"}`}
              >
                {actionStates.reset ? "Resetting..." : "Reset"}
              </Button>
            </div>

            {/* Simulation Controls */}
            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={() =>
                  handleActionWithFeedback(
                    () => handleSimulation("slow"),
                    "slow",
                    "🐌 Slow network simulation active!",
                    "🐌 Starting slow simulation...",
                  )
                }
                disabled={actionStates.slow}
                size="sm"
                variant="outline"
                className={`h-7 text-xs ${isDarkMode ? "border-gray-600 hover:bg-gray-800 text-white hover:text-white" : "border-gray-300 hover:bg-gray-100 text-black hover:text-black"}`}
              >
                <Wifi
                  className={`h-3 w-3 mr-1 ${actionStates.slow ? "animate-pulse" : ""}`}
                />
                {actionStates.slow ? "Simulating..." : "Slow"}
              </Button>
              <Button
                onClick={() =>
                  handleActionWithFeedback(
                    () => handleSimulation("error"),
                    "error",
                    "❌ Network error simulation active!",
                    "❌ Starting error simulation...",
                  )
                }
                disabled={actionStates.error}
                size="sm"
                variant="outline"
                className={`h-7 text-xs ${isDarkMode ? "border-gray-600 hover:bg-gray-800 text-white hover:text-white" : "border-gray-300 hover:bg-gray-100 text-black hover:text-black"}`}
              >
                <WifiOff
                  className={`h-3 w-3 mr-1 ${actionStates.error ? "animate-pulse" : ""}`}
                />
                {actionStates.error ? "Simulating..." : "Error"}
              </Button>
              <Button
                onClick={() =>
                  handleActionWithFeedback(
                    () => handleSimulation("server"),
                    "server",
                    "🔒 Server error simulation active!",
                    "🔒 Starting server simulation...",
                  )
                }
                disabled={actionStates.server}
                size="sm"
                variant="outline"
                className={`h-7 text-xs ${isDarkMode ? "border-gray-600 hover:bg-gray-800 text-white hover:text-white" : "border-gray-300 hover:bg-gray-100 text-black hover:text-black"}`}
              >
                <Server
                  className={`h-3 w-3 mr-1 ${actionStates.server ? "animate-pulse" : ""}`}
                />
                {actionStates.server ? "Simulating..." : "Server"}
              </Button>
              <Button
                onClick={() =>
                  handleActionWithFeedback(
                    () => handleSimulation("timeout"),
                    "timeout",
                    "⏱️ Timeout simulation active!",
                    "⏱️ Starting timeout simulation...",
                  )
                }
                disabled={actionStates.timeout}
                size="sm"
                variant="outline"
                className={`h-7 text-xs ${isDarkMode ? "border-gray-600 hover:bg-gray-800 text-white hover:text-white" : "border-gray-300 hover:bg-gray-100 text-black hover:text-black"}`}
              >
                <Timer
                  className={`h-3 w-3 mr-1 ${actionStates.timeout ? "animate-pulse" : ""}`}
                />
                {actionStates.timeout ? "Simulating..." : "Timeout"}
              </Button>
            </div>
          </div>

          {/* Action Feedback Message */}
          {showMessage && (
            <div
              className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"} pt-2 transition-colors duration-200`}
            >
              <div
                className={`text-xs text-center p-2 rounded ${isDarkMode ? "text-green-400 bg-gray-800" : "text-green-600 bg-green-50"} animate-pulse transition-colors duration-200`}
              >
                {actionMessage}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
