"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

export default function LocaleAttributes() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
