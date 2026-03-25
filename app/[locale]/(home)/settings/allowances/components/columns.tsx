"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";

import { type Allowance } from "@/actions/personnel/settings/allowances";

interface ColumnProps {
  onEdit: (allowance: Allowance) => void;
  onDelete: (allowance: Allowance) => void;
}

export const AllowancesColumns = () => {
  const t = useTranslations("settings.allowances");
  const commonT = useTranslations("common");

  return [
    {
      key: "name",
      header: commonT("name"),
    },
    {
      key: "contract_type_display",
      header: t("contractType"),
      cell: (row: Allowance) => row.contract_type_display ?? "-",
    },
    {
      key: "amount",
      header: t("amount"),
      cell: (row: Allowance) => {
        const num = Number(row.amount);
        if (Number.isNaN(num)) return "-";
        return num.toFixed(2);
      },
    },
    {
      key: "created_at",
      header: commonT("createdAt"),
      cell: (row: Allowance) => row.created_at ?? "-",
    },
    {
      key: "created_by_display",
      header: commonT("createdBy"),
      cell: (row: Allowance) => row.created_by_display ?? "-",
    },
    {
      key: "actions",
      header: commonT("actions"),
      cell: (row: Allowance, columnProps?: ColumnProps) => {
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

