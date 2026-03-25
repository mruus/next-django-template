"use client";

import { ReactNode } from "react";
import { useHasPermission } from "./use-has-permission";

type CanProps = {
  permission?: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export default function Can({ permission, children, fallback = null }: CanProps) {
  const hasPermission = useHasPermission();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

