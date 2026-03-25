"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";

import { type ContractType } from "@/actions/personnel/settings/contractTypes";

interface ColumnProps {
  onEdit: (contractType: ContractType) => void;
  onDelete: (contractType: ContractType) => void;
}

export const ContractTypesColumns = () => {
  const t = useTranslations("settings.contractTypes");
  const commonT = useTranslations("common");

  return [
    {
      key: "name",
      header: commonT("name"),
    },
    {
      key: "description",
      header: t("description"),
      cell: (row: ContractType) => {
        if (!row.description) return "-";
        return row.description;
      },
    },
    {
      key: "created_at",
      header: commonT("createdAt"),
      cell: (row: ContractType) => {
        if (!row.created_at) return "-";
        return row.created_at;
      },
    },
    {
      key: "created_by_display",
      header: commonT("createdBy"),
      cell: (row: ContractType) => {
        if (!row.created_by_display) return "-";
        return row.created_by_display;
      },
    },
    {
      key: "actions",
      header: commonT("actions"),
      cell: (row: ContractType, columnProps?: ColumnProps) => {
        const { onEdit, onDelete } = columnProps || {};

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(row)}
              className="h-8 w-8 p-0"
            >
              <HugeiconsIcon icon={Edit01Icon} className="h-4 w-4" />
              <span className="sr-only">{commonT("edit")}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete?.(row)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
              <span className="sr-only">{commonT("delete")}</span>
            </Button>
          </div>
        );
      },
    },
  ];
};

