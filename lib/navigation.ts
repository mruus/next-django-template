import { createNavigation } from "next-intl/navigation";
import { locales, defaultLocale } from "./i18n";

const { Link, useRouter, usePathname, redirect } = createNavigation({
  locales,
  localePrefix: "always",
  defaultLocale,
});

export { Link, useRouter, usePathname, redirect };
