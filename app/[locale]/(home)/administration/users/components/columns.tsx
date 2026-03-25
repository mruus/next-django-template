"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";
import type { UserType } from "@/actions/core/users";
import { useHasPermission } from "@/app/[locale]/(home)/components/use-has-permission";

interface ColumnProps {
  onEdit: (user: UserType) => void;
  onDelete: (user: UserType) => void;
}

export const UserColumns = () => {
  const commonT = useTranslations("common");
  const t = useTranslations("administration.users");
  const hasPermission = useHasPermission();

  const canChange = hasPermission("change_user");
  const canDelete = hasPermission("delete_user");
  const hasAnyActionPermission = canChange || canDelete;

  const columns = [
    {
      key: "avatar_url",
      header: "",
      cell: (row: UserType) => {
        if (row.avatar_url) {
          return (
            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
              <img
                src={row.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          );
        }
        return (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
            {(row.first_name?.[0] || row.username?.[0] || "?").toUpperCase()}
          </div>
        );
      },
    },
    {
      key: "username",
      header: commonT("username") ?? "Username",
      cell: (row: UserType) => row.username ?? "-",
    },
    {
      key: "display_name",
      header: commonT("name"),
      cell: (row: UserType) =>
        [row.first_name, row.last_name].filter(Boolean).join(" ") || "-",
    },
    {
      key: "email",
      header: commonT("email") ?? "Email",
      cell: (row: UserType) => row.email ?? "-",
    },
    {
      key: "status",
      header: t("status"),
      cell: (row: UserType) => row.status ?? "-",
    },
    {
      key: "created_at",
      header: commonT("createdAt"),
      cell: (row: UserType) => row.created_at ?? "-",
    },
    ...(hasAnyActionPermission
      ? [
          {
            key: "actions",
            header: commonT("actions"),
            cell: (row: UserType, columnProps?: ColumnProps) => {
              const { onEdit, onDelete } = columnProps || {};
              return (
                <div className="flex items-center gap-2">
                  {canChange && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit?.(row)}
                      className="h-8 w-8 p-0"
                    >
                      <HugeiconsIcon icon={Edit01Icon} className="h-4 w-4" />
                      <span className="sr-only">{commonT("edit")}</span>
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete?.(row)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                      <span className="sr-only">{commonT("delete")}</span>
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return columns;
};
