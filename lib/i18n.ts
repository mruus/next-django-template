export const locales = ["en", "ar", "so"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
