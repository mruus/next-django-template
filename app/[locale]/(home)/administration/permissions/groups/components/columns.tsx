"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Edit01Icon,
  Cancel01Icon,
  UserIcon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";
import { GroupType } from "@/actions/core/groups";
import { Link } from "@/lib/navigation";
import { useHasPermission } from "@/app/[locale]/(home)/components/use-has-permission";

interface ColumnProps {
  onEdit: (group: GroupType) => void;
  onDelete: (group: GroupType) => void;
}

export const GroupColumns = () => {
  const t = useTranslations("administration.permissions.groups");
  const commonT = useTranslations("common");
  const hasPermission = useHasPermission();

  const canChange = hasPermission("change_group");
  const canDelete = hasPermission("delete_group");
  console.log("DELETE", canDelete);
  console.log("CHANGE", canChange);
  const hasAnyActionPermission = canChange || canDelete;
  console.log("HAS ANY ACTION", hasAnyActionPermission);

  const columns = [
    {
      key: "name",
      header: commonT("name"),
      cell: (row: GroupType) => {
        return (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <HugeiconsIcon
                icon={UserIcon}
                className="h-4 w-4 text-blue-600"
              />
            </div>
            <Link
              href={`/administration/permissions/groups/${row.id}`}
              className="font-medium text-primary hover:underline"
            >
              {row.name}
            </Link>
          </div>
        );
      },
    },
    {
      key: "permissions_count",
      header: t("permissions"),
      cell: (row: GroupType) => {
        const count = row.permissions_count || 0;
        return (
          <Badge variant={count > 0 ? "default" : "outline"}>
            <div className="flex items-center gap-1">
              <HugeiconsIcon icon={ShieldIcon} className="h-3 w-3" />
              <span>{count}</span>
            </div>
          </Badge>
        );
      },
    },
    // {
    //   key: "permissions",
    //   header: t("permissionList"),
    //   cell: (row: GroupType) => {
    //     if (!row.permissions || row.permissions.length === 0) {
    //       return "-";
    //     }
    //     return (
    //       <div className="flex flex-wrap gap-2">
    //         {row.permissions.slice(0, 3).map((permission) => (
    //           <Badge
    //             key={permission.id}
    //             variant="secondary"
    //             className="text-xs truncate"
    //             title={permission.name}
    //           >
    //             {permission.codename}
    //           </Badge>
    //         ))}
    //         {row.permissions.length > 3 && (
    //           <Badge variant="outline" className="text-xs">
    //             +{row.permissions.length - 3} more
    //           </Badge>
    //         )}
    //       </div>
    //     );
    //   },
    // },

    ...(hasAnyActionPermission
      ? [
          {
            key: "actions",
            header: commonT("actions"),
            cell: (row: GroupType, columnProps?: ColumnProps) => {
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
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        className="h-4 w-4"
                      />
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
