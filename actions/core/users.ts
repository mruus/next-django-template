"use server";

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/actions/base";

export interface UserType {
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
}

export interface PaginatedUserData {
  data: UserType[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateUserData {
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  password?: string;
  gender?: string;
  status?: string;
  phone?: string;
  avatar?: File | null;
}

export interface UpdateUserData {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  gender?: string;
  status?: string;
  phone?: string;
  avatar?: File | null;
}

function buildUserFormData(data: CreateUserData | UpdateUserData): FormData {
  const form = new FormData();
  const keys = [
    "username",
    "first_name",
    "last_name",
    "email",
    "password",
    "gender",
    "status",
    "phone",
  ] as const;
  keys.forEach((key) => {
    const v = data[key];
    if (v !== undefined && v !== null && v !== "")
      form.append(key, typeof v === "string" ? v : String(v));
  });
  if (data.avatar instanceof File) form.append("avatar", data.avatar);
  return form;
}

export async function listUsersAction(page?: number, pageSize?: number) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedUserData;
  }>("users/", { params });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createUserAction(data: CreateUserData) {
  const hasFile = data.avatar instanceof File;
  const body = hasFile
    ? buildUserFormData(data)
    : {
        username: data.username,
        first_name: data.first_name ?? "",
        last_name: data.last_name ?? "",
        email: data.email,
        password: data.password ?? "",
        gender: data.gender ?? "Male",
        status: data.status ?? "active",
        phone: data.phone ?? "",
      };

  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("users/create/", body);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function retrieveUserAction(id: string) {
  const result = await apiGet<{
    error: boolean;
    message: UserType;
  }>(`users/${id}/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updateUserAction(id: string, data: UpdateUserData) {
  const hasFile = data.avatar instanceof File;
  const body = hasFile
    ? buildUserFormData(data)
    : {
        ...(data.username !== undefined && { username: data.username }),
        ...(data.first_name !== undefined && { first_name: data.first_name }),
        ...(data.last_name !== undefined && { last_name: data.last_name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.password !== undefined && data.password !== "" && { password: data.password }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.phone !== undefined && { phone: data.phone }),
      };

  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`users/${id}/update/`, body);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function partialUpdateUserAction(id: string, data: UpdateUserData) {
  const hasFile = data.avatar instanceof File;
  const body = hasFile
    ? buildUserFormData(data)
    : {
        ...(data.username !== undefined && { username: data.username }),
        ...(data.first_name !== undefined && { first_name: data.first_name }),
        ...(data.last_name !== undefined && { last_name: data.last_name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.password !== undefined && data.password !== "" && { password: data.password }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.phone !== undefined && { phone: data.phone }),
      };

  const result = await apiPatch<{
    error: boolean;
    message: string;
  }>(`users/${id}/update/`, body);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deleteUserAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`users/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export interface UserSearchHit {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export async function searchUsersAction(q: string, limit = 20) {
  const result = await apiGet<{
    error: boolean;
    message: {
      users: UserSearchHit[];
    };
  }>("users/search/", {
    params: { q, limit },
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function getUserGroupIdsAction(userId: string) {
  const result = await apiGet<{
    error: boolean;
    message: {
      group_ids: number[];
    };
  }>(`users/${userId}/groups/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function applyUserGroupsDeltaAction(
  userId: string,
  payload: { addGroupIds: number[]; removeGroupIds: number[] },
) {
  const result = await apiPost<{
    error: boolean;
    message: {
      user_id: string;
      added_group_ids: number[];
      removed_group_ids: number[];
    };
  }>(`users/${userId}/groups/delta/`, {
    add_group_ids: payload.addGroupIds,
    remove_group_ids: payload.removeGroupIds,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}
