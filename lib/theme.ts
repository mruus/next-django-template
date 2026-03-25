// lib/theme.ts
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/**
 * Custom hook for accessing theme functionality
 */
export function useTheme() {
  return {
    modeAtom: themeModeAtom,
    hasMountedAtom,
    resolvedThemeAtom,
  };
}

/**
 * User preference
 */
export const themeModeAtom = atomWithStorage<"light" | "dark" | "system">(
  "theme",
  "system",
);

/**
 * Client mounted flag
 */
export const hasMountedAtom = atom(false);

/**
 * Resolved theme (SSR-safe)
 */
export const resolvedThemeAtom = atom<"light" | "dark">((get) => {
  const mode = get(themeModeAtom);
  const mounted = get(hasMountedAtom);

  // SSR + first render must match
  if (!mounted) return "light";

  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return mode;
});
