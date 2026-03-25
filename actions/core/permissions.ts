"use server";

import { apiGet, apiPost } from "@/actions/base";

export interface PermissionType {
  id: number;
  name: string;
  codename: string;
  content_type: {
    id: number;
    app_label: string;
    model: string;
  };
  source?: string;
  sources?: string[];
  group?: {
    id: number;
    name: string;
  };
  groups?: Array<{
    id: number;
    name: string;
  }>;
}

export interface GroupType {
  id: number;
  name: string;
}

export interface UserWithPermissionsType {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  status: string;
  phone: string;
  avatar: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_by: string | null;
  created_by_display: string | null;
  updated_by: string | null;
  updated_by_display: string | null;
  created_at: string;
  updated_at: string;
  direct_permissions: PermissionType[];
  group_permissions: PermissionType[];
  all_permissions: PermissionType[];
  groups: GroupType[];
}

export interface PaginatedPermissionsData {
  data: UserWithPermissionsType[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AssignableCustomPermissionItem {
  id: string;
  name: string;
  codename: string | null;
  tn_parent_id: string | null;
  tn_level: number;
  tn_order: number;
  permission: {
    id: number;
    name: string;
    codename: string;
    content_type: {
      id: number;
      app_label: string;
      model: string;
    };
  } | null;
  checked: boolean;
  direct_checked: boolean;
  inherited_checked: boolean;
  inherited_from_groups: Array<{ id: number; name: string }>;
  removable: boolean;
}

export async function listAssignableCustomPermissionsForGroupAction(groupId: number) {
  const result = await apiGet<{
    error: boolean;
    message: {
      permissions: AssignableCustomPermissionItem[];
    };
  }>("permissions/assignable-custom-permissions/", {
    params: { group_id: groupId },
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function applyGroupPermissionsDeltaAction(
  groupId: number,
  payload: {
    addPermissionIds: number[];
    removePermissionIds: number[];
  },
) {
  const result = await apiPost<{
    error: boolean;
    message: {
      group_id: number;
      added_permission_ids: number[];
      removed_permission_ids: number[];
    };
  }>("permissions/assignable-custom-permissions/apply-group/", {
    group_id: groupId,
    add_permission_ids: payload.addPermissionIds,
    remove_permission_ids: payload.removePermissionIds,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function listAssignableCustomPermissionsForUserAction(userId: string) {
  const result = await apiGet<{
    error: boolean;
    message: {
      permissions: AssignableCustomPermissionItem[];
    };
  }>("permissions/assignable-custom-permissions/", {
    params: { user_id: userId },
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function applyUserDirectPermissionsDeltaAction(
  userId: string,
  payload: {
    addPermissionIds: number[];
    removePermissionIds: number[];
  },
) {
  const result = await apiPost<{
    error: boolean;
    message: {
      user_id: string;
      added_permission_ids: number[];
      removed_permission_ids: number[];
    };
  }>("permissions/assignable-custom-permissions/apply-user-direct/", {
    user_id: userId,
    add_permission_ids: payload.addPermissionIds,
    remove_permission_ids: payload.removePermissionIds,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function listUsersWithPermissionsAction(
  page?: number,
  pageSize?: number,
) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedPermissionsData;
  }>("permissions/", { params });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}
