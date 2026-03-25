"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";

import { type PayScale } from "@/actions/personnel/settings/payScale";

interface ColumnProps {
  onEdit: (payScale: PayScale) => void;
  onDelete: (payScale: PayScale) => void;
}

export const PayScaleColumns = () => {
  const t = useTranslations("settings.payScale");
  const commonT = useTranslations("common");

  const formatMoney = (value: unknown) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "-";
    return num.toFixed(2);
  };

  return [
    {
      key: "rank_display",
      header: t("rank"),
    },
    {
      key: "contract_type_display",
      header: t("contractType"),
    },
    {
      key: "salary",
      header: t("salary"),
      cell: (row: PayScale) => formatMoney(row.salary),
    },
    {
      key: "age_of_retirement",
      header: t("ageOfRetirement"),
      cell: (row: PayScale) => row.age_of_retirement ?? "-",
    },
    {
      key: "created_at",
      header: commonT("createdAt"),
      cell: (row: PayScale) => row.created_at ?? "-",
    },
    {
      key: "created_by_display",
      header: commonT("createdBy"),
      cell: (row: PayScale) => row.created_by_display ?? "-",
    },
    {
      key: "actions",
      header: commonT("actions"),
      cell: (row: PayScale, columnProps?: ColumnProps) => {
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

