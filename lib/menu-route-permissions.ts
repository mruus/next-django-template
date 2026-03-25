/**
 * Single source for path → permission (middleware + menu).
 * Order does not matter; longest-path match is applied at runtime.
 */
export const menuProtectedRoutes = [
  { path: "/personnel/create", permission: "add_user" },
  { path: "/personnel", permission: "view_user" },
  { path: "/settings/tribes", permission: "view_tribes" },
  { path: "/settings/locations", permission: "view_locations" },
  { path: "/settings/labels", permission: "view_label" },
  { path: "/settings/qualifications", permission: "view_qualification" },
  { path: "/settings/banks", permission: "view_banks" },
  { path: "/settings/battalion-tree", permission: "view_battaliontree" },
  { path: "/settings/job-titles", permission: "view_jobtitles" },
  { path: "/settings/ranks", permission: "view_ranks" },
  { path: "/settings/payScale", permission: "view_payscale" },
  { path: "/settings/contract-types", permission: "view_contracttypes" },
  { path: "/settings/allowances", permission: "view_allowances" },


  // Administration
  // 1. Users
  { path: "/administration/users", permission: "view_user" },

  // 2. Groups
  { path: "/administration/permissions/groups", permission: "view_group" },
  
  // 3. Permisisons
  {
    path: "/administration/permissions",
    permission: "view_permission",
  },
  { path: "/administration/permissions/assign", permission: "add_permission" },
  
  // 4. Sync
  {
    path: "/administration/permissions/sync-menu",
    permission: "view_custompermissions",
  },
] as const;

const sortedByPathLengthDesc = [...menuProtectedRoutes].sort(
  (a, b) => b.path.length - a.path.length,
);

export function getRequiredPermissionForPath(
  pathnameWithoutLocale: string,
): string | null {
  const p =
    pathnameWithoutLocale === "" ? "/" : pathnameWithoutLocale.split("?")[0];
  if (p === "/") return null;
  for (const { path, permission } of sortedByPathLengthDesc) {
    if (p === path || p.startsWith(`${path}/`)) {
      return permission;
    }
  }
  return null;
}

export const hrefToPermission: Record<string, string> = Object.fromEntries(
  menuProtectedRoutes.map((r) => [r.path, r.permission]),
);
