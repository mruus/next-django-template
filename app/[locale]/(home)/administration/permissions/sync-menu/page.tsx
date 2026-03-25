
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SyncMenuPage from "./page.client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("administration.permissions");

  return {
    title: t("syncMenu.title") || "Menu Permissions Sync",
    description: t("syncMenu.description") || "Sync menu structure with Django permissions",
  };
}

export default function Page() {
  return <SyncMenuPage />;
}
