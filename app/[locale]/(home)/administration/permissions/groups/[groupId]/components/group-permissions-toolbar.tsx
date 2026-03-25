"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type GroupPermissionsToolbarProps = {
  selectedCount: number;
  isDirty: boolean;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
};

export function GroupPermissionsToolbar({
  selectedCount,
  isDirty,
  isSaving,
  onReset,
  onSave,
}: GroupPermissionsToolbarProps) {
  const t = useTranslations("administration.permissions.groups");
  const commonT = useTranslations("common");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold">{t("permissions")}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("selectedCount", { count: selectedCount })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={!isDirty || isSaving}
        >
          {t("resetChanges")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isSaving}
        >
          {commonT("save")}
        </Button>
      </div>
    </div>
  );
}
