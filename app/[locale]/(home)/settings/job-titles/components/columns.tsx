"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";

import { type JobTitle } from "@/actions/personnel/settings/jobTitles";

interface ColumnProps {
  onEdit: (jobTitle: JobTitle) => void;
  onDelete: (jobTitle: JobTitle) => void;
}

export const JobTitlesColumns = () => {
  const commonT = useTranslations("common");
  const t = useTranslations("settings.jobTitles");

  return [
    {
      key: "name",
      header: commonT("name"),
    },
    {
      key: "created_at",
      header: commonT("createdAt"),
      cell: (row: JobTitle) => row.created_at ?? "-",
    },
    {
      key: "created_by_display",
      header: commonT("createdBy"),
      cell: (row: JobTitle) => row.created_by_display ?? "-",
    },
    {
      key: "actions",
      header: commonT("actions"),
      cell: (row: JobTitle, columnProps?: ColumnProps) => {
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

