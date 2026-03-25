"use client";

import { useAtom } from "jotai";
import {
  colorSchemeAtom,
  fontAtom,
  languageAtom,
  menuTypeAtom,
} from "@/atoms/menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/lib/navigation";

const COLOR_SCHEMES = [
  { labelKey: "drawerTheme.blue", value: "oklch(0.488 0.243 264.376)" },
  { labelKey: "drawerTheme.indigo", value: "oklch(0.46 0.24 277)" },
  { labelKey: "drawerTheme.violet", value: "oklch(0.49 0.27 292)" },
  { labelKey: "drawerTheme.purple", value: "oklch(0.49 0.25 305)" },
  { labelKey: "drawerTheme.pink", value: "oklch(0.58 0.22 340)" },
  { labelKey: "drawerTheme.red", value: "oklch(0.58 0.22 27)" },
  { labelKey: "drawerTheme.orange", value: "oklch(0.65 0.2 50)" },
  { labelKey: "drawerTheme.amber", value: "oklch(0.72 0.18 70)" },
  { labelKey: "drawerTheme.lime", value: "oklch(0.65 0.18 130)" },
  { labelKey: "drawerTheme.green", value: "oklch(0.6 0.18 150)" },
  { labelKey: "drawerTheme.teal", value: "oklch(0.58 0.15 185)" },
  { labelKey: "drawerTheme.cyan", value: "oklch(0.6 0.15 210)" },
];

const LANGUAGES = [
  { labelKey: "drawerTheme.english", value: "en" },
  { labelKey: "drawerTheme.somali", value: "so" },
  { labelKey: "drawerTheme.arabic", value: "ar" },
] as const;

const FONTS_LATIN = [
  { labelKey: "drawerTheme.poppins", value: "poppins" as const },
  { labelKey: "drawerTheme.roboto", value: "roboto" as const },
  { labelKey: "drawerTheme.inter", value: "inter" as const },
];

const FONTS_ARABIC = [
  { labelKey: "drawerTheme.tajawal", value: "tajawal" as const },
  {
    labelKey: "drawerTheme.notoNaskhArabic",
    value: "noto-naskh-arabic" as const,
  },
  { labelKey: "drawerTheme.amiri", value: "amiri" as const },
];

export default function ThemeDrawer() {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useAtom(languageAtom);
  const [menuType, setMenuType] = useAtom(menuTypeAtom);
  const [colorScheme, setColorScheme] = useAtom(colorSchemeAtom);
  const [font, setFont] = useAtom(fontAtom);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", colorScheme);
  }, [colorScheme]);

  const latinFonts = ["poppins", "roboto", "inter"] as const;
  const arabicFonts = ["tajawal", "noto-naskh-arabic", "amiri"] as const;
  const isLatinFont = latinFonts.includes(font as (typeof latinFonts)[number]);
  const isArabicFont = arabicFonts.includes(
    font as (typeof arabicFonts)[number],
  );

  useEffect(() => {
    if (locale === "ar" && isLatinFont) setFont("tajawal");
    if (locale !== "ar" && isArabicFont) setFont("poppins");
  }, [locale]);

  useEffect(() => {
    document.body.classList.remove(
      "font-poppins",
      "font-roboto",
      "font-inter",
      "font-tajawal",
      "font-noto-naskh-arabic",
      "font-amiri",
    );
    document.body.classList.add(`font-${font}`);
  }, [font]);

  const drawerDirection =
    locale === "ar"
      ? menuType === "horizontal"
        ? "right"
        : "left"
      : menuType === "horizontal"
        ? "left"
        : "right";

  return (
    <Drawer direction={drawerDirection}>
      <DrawerTrigger asChild>
        <button className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer rounded-md">
          <Settings size={16} strokeWidth={1.5} className="shrink-0" />
          <span className="relative">
            {t("drawerTheme.theme")}
            <Badge
              variant="destructive"
              className="absolute -top-2.5 -end-5 text-[10px] px-1 py-0 h-4 min-w-4"
            >
              {t("drawerTheme.new")}
            </Badge>
          </span>
        </button>
      </DrawerTrigger>

      <DrawerContent className="sm:max-w-sm overflow-y-auto">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="text-base font-semibold text-start">
            {t("drawerTheme.themeSettings")}
          </DrawerTitle>
        </DrawerHeader>

        <div className="p-5 flex flex-col gap-7">
          <section>
            <p className="text-sm font-medium mb-1 text-start">
              {t("drawerTheme.colorMode")}
            </p>
            <p className="text-xs text-muted-foreground mb-3 text-start">
              {t("drawerTheme.colorModeDescription")}
            </p>
            <div className="flex flex-col gap-2">
              {(["light", "dark", "system"] as const).map((mode) => (
                <label
                  key={mode}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="color-mode"
                    checked={theme === mode}
                    onChange={() => setTheme(mode)}
                    className="accent-primary"
                  />
                  <span className="text-sm">
                    {mode === "system"
                      ? t("drawerTheme.system")
                      : t(`drawerTheme.${mode}`)}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-medium mb-1 text-start">
              {t("drawerTheme.language")}
            </p>
            <p className="text-xs text-muted-foreground mb-3 text-start">
              {t("drawerTheme.languageDescription")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((lang) => (
                <label
                  key={lang.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="language"
                    checked={locale === lang.value}
                    onChange={() => {
                      setLanguage(lang.value);
                      router.replace(pathname, { locale: lang.value });
                    }}
                    className="accent-primary"
                  />
                  <span className="text-sm">{t(lang.labelKey)}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-medium mb-1 text-start">
              {t("drawerTheme.layoutMode")}
            </p>
            <p className="text-xs text-muted-foreground mb-3 text-start">
              {t("drawerTheme.layoutModeDescription")}
            </p>
            <div className="flex flex-col gap-2">
              {(["horizontal", "vertical"] as const).map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="menu-type"
                    checked={menuType === type}
                    onChange={() => setMenuType(type)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{t(`drawerTheme.${type}`)}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-medium mb-1 text-start">
              {t("drawerTheme.colorScheme")}
            </p>
            <p className="text-xs text-muted-foreground mb-3 text-start">
              {t("drawerTheme.colorSchemeDescription")}
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_SCHEMES.map((scheme) => (
                <button
                  key={scheme.value}
                  title={t(scheme.labelKey)}
                  onClick={() => setColorScheme(scheme.value)}
                  className="w-8 h-8 rounded-md border-2 transition-all"
                  style={{
                    backgroundColor: scheme.value,
                    borderColor:
                      colorScheme === scheme.value ? "black" : "transparent",
                  }}
                />
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-medium mb-1 text-start">
              {t("drawerTheme.font")}
            </p>
            <p className="text-xs text-muted-foreground mb-3 text-start">
              {t("drawerTheme.fontDescription")}
            </p>
            <div className="flex flex-col gap-2">
              {(locale === "ar" ? FONTS_ARABIC : FONTS_LATIN).map((f) => (
                <label
                  key={f.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="font"
                    checked={font === f.value}
                    onChange={() => setFont(f.value)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{t(f.labelKey)}</span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
