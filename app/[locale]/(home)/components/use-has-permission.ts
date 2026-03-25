"use client";

import { useCallback } from "react";
import { useAtomValue } from "jotai";
import { permissionsAtom } from "@/atoms/menu";

export function useHasPermission() {
  const permissions = useAtomValue(permissionsAtom);

  return useCallback(
    (permission?: string) => {
      if (!permission) return true;
      return permissions.includes(permission);
    },
    [permissions],
  );
}

