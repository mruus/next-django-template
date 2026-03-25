"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Edit01Icon,
  Cancel01Icon,
  Globe02Icon,
  ComputerIcon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";

interface Label {
  id: string;
  name: string;
  type: string;
  year: number;
  month: number;
  language: string;
  is_active: boolean;
  is_deleted: boolean;
  created_by: string | null;
  created_by_display: string | null;
  updated_by: string | null;
  updated_by_display: string | null;
  created_at: string;
  updated_at: string;
}

interface ColumnProps {
  onEdit: (label: Label) => void;
  onDelete: (label: Label) => void;
}

export const LabelColumns = () => {
  const t = useTranslations("settings.labels");
  const commonT = useTranslations("common");

  return [
    {
      key: "name",
      header: commonT("name"),
    },
    {
      key: "type",
      header: commonT("type"),
      cell: (row: Label) => {
        const getTypeColor = (type: string) => {
          switch (type) {
            case "battalion":
              return "bg-blue-100 text-blue-800 border-blue-200";
            case "location":
              return "bg-green-100 text-green-800 border-green-200";
            default:
              return "bg-gray-100 text-gray-800 border-gray-200";
          }
        };

        const getTypeIcon = (type: string) => {
          switch (type) {
            case "battalion":
              return ShieldIcon;
            case "location":
              return Globe02Icon;
            default:
              return ComputerIcon;
          }
        };

        const getTypeDisplayName = (type: string) => {
          switch (type) {
            case "battalion":
              return t("battalion");
            case "location":
              return t("location");
            default:
              return t("other");
          }
        };

        return (
          <Badge
            variant="outline"
            className={`gap-1 ${getTypeColor(row.type)}`}
          >
            <HugeiconsIcon icon={getTypeIcon(row.type)} className="h-3 w-3" />
            {getTypeDisplayName(row.type)}
          </Badge>
        );
      },
    },
    {
      key: "created_at",
      header: commonT("createdAt"),
      cell: (row: Label) => {
        if (!row.created_at) return "-";
        return row.created_at; // Will be formatted by RobustDateTimeField
      },
    },
    {
      key: "created_by_display",
      header: commonT("createdBy"),
      cell: (row: Label) => {
        if (!row.created_by_display) return "-";
        return row.created_by_display;
      },
    },
    {
      key: "actions",
      header: commonT("actions"),
      cell: (row: Label, columnProps?: ColumnProps) => {
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
