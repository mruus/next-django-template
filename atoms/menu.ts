import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const menuTypeAtom = atomWithStorage<"horizontal" | "vertical">(
  "sna-menu-type",
  "horizontal",
);

export const languageAtom = atomWithStorage<"en" | "so" | "ar">(
  "sna-language",
  "en",
);

export const colorSchemeAtom = atomWithStorage<string>(
  "sna-color-scheme",
  "oklch(0.488 0.243 264.376)",
);

export type LatinFont = "poppins" | "roboto" | "inter";
export type ArabicFont = "tajawal" | "noto-naskh-arabic" | "amiri";
export type FontValue = LatinFont | ArabicFont;

export const fontAtom = atomWithStorage<FontValue>("sna-font", "poppins");

export const sidebarOpenAtom = atom<boolean>(true);
export const isDesktopAtom = atom<boolean>(false);
export const breakpointReadyAtom = atom<boolean>(false);

export type PermissionSource = "ws" | "api" | null;

export const permissionsAtom = atomWithStorage<string[]>("sna-permissions", []);
export const permissionsVersionAtom = atomWithStorage<number | null>(
  "sna-permissions-version",
  null,
);
export const permissionsSourceAtom = atomWithStorage<PermissionSource>(
  "sna-permissions-source",
  null,
);
