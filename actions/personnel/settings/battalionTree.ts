"use server";

import { apiDelete, apiGet, apiPut, apiPost, apiPatch } from "@/actions/base";

export interface BattalionTree {
  id: string;
  name: string;
  label: string;
  label_display: string;
  tn_parent: string | null;
  tn_level: number;
  tn_priority: number;
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

export interface CreateBattalionTreeData {
  name: string;
  label: string;
  tn_parent: string | null;
}

export interface UpdateBattalionTreeData {
  name?: string;
  label?: string;
  tn_parent?: string | null;
}

export async function listBattalionTreesAction() {
  const result = await apiGet<{
    error: boolean;
    message: BattalionTree[];
  }>("personnel/settings/battalionTree/");

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createBattalionTreeAction(data: CreateBattalionTreeData) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/battalionTree/create/", data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updateBattalionTreeAction(
  id: string,
  data: UpdateBattalionTreeData,
) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/battalionTree/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deleteBattalionTreeAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/battalionTree/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

