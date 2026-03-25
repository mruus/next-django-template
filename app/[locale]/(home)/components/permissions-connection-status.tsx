"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";

export function PermissionsConnectionStatus() {
  const { canConnect, isConnecting, isConnected, hasError, retryConnection } =
    usePermissions();

  const prevSuccessfulRef = useRef(false);

  useEffect(() => {
    const successful = !isConnecting && isConnected && !hasError;

    // if (successful && !prevSuccessfulRef.current) {
    //   toast.success("Realtime service connected");
    // }

    prevSuccessfulRef.current = successful;
  }, [isConnecting, isConnected, hasError]);

  const successful = !isConnecting && isConnected && !hasError;

  if (!canConnect) {
    return null;
  }

  if (successful) {
    return null;
  }

  const showConnecting = isConnecting || (!isConnected && !hasError);
  console.log("Connection", showConnecting);
  if (showConnecting) {
    return (
     <div className="fixed top-0 left-0 w-full bg-primary/20 text-sm py-1">
        <div className="w-full h-full flex items-center justify-center gap-2">
        <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
            <span className="whitespace-nowrap text-primary text-sm">
              Connecting to realtime service...
            </span>
        </div>
      </div>
    );
  }

  if (hasError && !isConnecting) {
    return (
      <div className="fixed bottom-0 left-0 w-screen bg-primary text-primary-foreground p-3 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <span className="font-medium whitespace-nowrap">
              Realtime service connection failed
            </span>
          </div>
          <button
            onClick={retryConnection}
            className="px-4 py-1.5 bg-primary-foreground text-primary rounded-md text-sm font-medium hover:bg-primary-foreground/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return null;
}
