"use server";

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/actions/base";

export interface PermissionType {
  id: number;
  name: string;
  codename: string;
  content_type: number;
}

export interface GroupType {
  id: number;
  name: string;
  permissions: PermissionType[];
  permissions_count: number;
}

export interface PaginatedGroupData {
  data: GroupType[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateGroupData {
  name: string;
  permission_ids?: number[];
}

export interface UpdateGroupData {
  name?: string;
  permission_ids?: number[];
}

// List all groups
export async function listGroupsAction(page?: number, pageSize?: number) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedGroupData;
  }>("permissions/groups/", {
    params,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Create new group
export async function createGroupAction(data: CreateGroupData) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("permissions/groups/create/", data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Retrieve specific group by ID
export async function retrieveGroupAction(id: number) {
  const result = await apiGet<{
    error: boolean;
    message: GroupType;
  }>(`permissions/groups/${id}/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Update group by ID
export async function updateGroupAction(id: number, data: UpdateGroupData) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`permissions/groups/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Partial update group by ID
export async function partialUpdateGroupAction(
  id: number,
  data: UpdateGroupData,
) {
  const result = await apiPatch<{
    error: boolean;
    message: string;
  }>(`permissions/groups/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Delete group by ID
export async function deleteGroupAction(id: number) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`permissions/groups/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}
