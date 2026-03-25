"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";

import { type Rank } from "@/actions/personnel/settings/ranks";

interface ColumnProps {
  onEdit: (rank: Rank) => void;
  onDelete: (rank: Rank) => void;
}

export const RanksColumns = () => {
  const t = useTranslations("settings.ranks");
  const commonT = useTranslations("common");

  const formatMonthsOfService = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    return `${years} ${t("years")}, ${remainingMonths} ${t("months")}`;
  };

  return [
    {
      key: "name",
      header: commonT("name"),
    },
    {
      key: "months_of_service",
      header: t("monthsOfService"),
      cell: (row: Rank) => {
        return (
          <Badge variant="outline" className="gap-1">
            <HugeiconsIcon icon={Edit01Icon} className="h-3 w-3 opacity-60" />
            {formatMonthsOfService(row.months_of_service)}
          </Badge>
        );
      },
    },
    {
      key: "created_at",
      header: commonT("createdAt"),
      cell: (row: Rank) => {
        if (!row.created_at) return "-";
        return row.created_at;
      },
    },
    {
      key: "created_by_display",
      header: commonT("createdBy"),
      cell: (row: Rank) => {
        if (!row.created_by_display) return "-";
        return row.created_by_display;
      },
    },
    {
      key: "actions",
      header: commonT("actions"),
      cell: (row: Rank, columnProps?: ColumnProps) => {
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

