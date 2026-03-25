"use server";

import { apiDelete, apiGet, apiPost, apiPut } from "@/actions/base";

export interface Tribe {
  id: string;
  name: string;
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

export interface CreateTribeData {
  name: string;
  tn_parent: string | null;
}

export interface UpdateTribeData {
  name?: string;
}

export async function listTribesAction() {
  const result = await apiGet<{
    error: boolean;
    message: Tribe[];
  }>("personnel/settings/tribes/");

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createTribeAction(data: CreateTribeData) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/tribes/create/", data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updateTribeAction(id: string, data: UpdateTribeData) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/tribes/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deleteTribeAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/tribes/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

