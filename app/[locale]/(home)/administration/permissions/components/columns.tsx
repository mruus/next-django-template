"use client";

import { Badge } from "@/components/ui/badge";
import { UserWithPermissionsType } from "@/actions/core/permissions";

export const PermissionsColumns = (
  t: (key: string) => string,
  commonT: (key: string) => string,
) => {
  return [
    {
      key: "username",
      header: commonT("username"),
      cell: (row: UserWithPermissionsType) => {
        return (
          <div className="flex flex-col">
            <span className="font-medium">{row.username}</span>
            <span className="text-xs text-muted-foreground">{row.email}</span>
          </div>
        );
      },
    },
    {
      key: "name",
      header: commonT("name"),
      cell: (row: UserWithPermissionsType) => {
        const fullName = [row.first_name, row.last_name]
          .filter(Boolean)
          .join(" ");
        return fullName || "-";
      },
    },
    {
      key: "status",
      header: commonT("status"),
      cell: (row: UserWithPermissionsType) => {
        const getStatusColor = (status: string) => {
          switch (status) {
            case "active":
              return "bg-green-100 text-green-800 border-green-200";
            case "suspended":
              return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "blocked":
              return "bg-red-100 text-red-800 border-red-200";
            default:
              return "bg-gray-100 text-gray-800 border-gray-200";
          }
        };

        const getStatusDisplayName = (status: string) => {
          switch (status) {
            case "active":
              return t("status_active");
            case "suspended":
              return t("status_suspended");
            case "blocked":
              return t("status_blocked");
            default:
              return status;
          }
        };

        return (
          <Badge variant="outline" className={`${getStatusColor(row.status)}`}>
            {getStatusDisplayName(row.status)}
          </Badge>
        );
      },
    },
    {
      key: "groups",
      header: t("groups"),
      cell: (row: UserWithPermissionsType) => {
        if (!row.groups || row.groups.length === 0) {
          return "-";
        }
        return (
          <div className="flex flex-wrap gap-1">
            {row.groups.slice(0, 3).map((group) => (
              <Badge key={group.id} variant="secondary" className="text-xs">
                {group.name}
              </Badge>
            ))}
            {row.groups.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{row.groups.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "direct_permissions",
      header: t("directPermissions"),
      cell: (row: UserWithPermissionsType) => {
        const count = row.direct_permissions?.length || 0;
        return (
          <Badge variant={count > 0 ? "default" : "outline"}>{count}</Badge>
        );
      },
    },
    {
      key: "group_permissions",
      header: t("groupPermissions"),
      cell: (row: UserWithPermissionsType) => {
        const count = row.group_permissions?.length || 0;
        return (
          <Badge variant={count > 0 ? "default" : "outline"}>{count}</Badge>
        );
      },
    },
    {
      key: "all_permissions",
      header: t("allPermissions"),
      cell: (row: UserWithPermissionsType) => {
        const count = row.all_permissions?.length || 0;
        return (
          <Badge variant={count > 0 ? "secondary" : "outline"}>
            {count} total
          </Badge>
        );
      },
    },
    {
      key: "created_at",
      header: commonT("createdAt"),
      cell: (row: UserWithPermissionsType) => {
        if (!row.created_at) return "-";
        return row.created_at;
      },
    },
  ];
};
