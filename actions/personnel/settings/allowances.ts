"use server";

import { apiDelete, apiGet, apiPut, apiPost, apiPatch } from "@/actions/base";

export interface Allowance {
  id: string;
  contract_type: string;
  contract_type_display: string;
  name: string;
  amount: number;
  description: string | null;
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

export interface PaginatedAllowanceData {
  data: Allowance[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateAllowanceData {
  contract_type: string;
  name: string;
  amount: number;
  description?: string;
}

export interface UpdateAllowanceData {
  contract_type?: string;
  name?: string;
  amount?: number;
  description?: string | null;
}

export async function listAllowancesAction(page?: number, pageSize?: number) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedAllowanceData;
  }>("personnel/settings/allowances/", { params });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createAllowanceAction(data: CreateAllowanceData) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/allowances/create/", data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updateAllowanceAction(
  id: string,
  data: UpdateAllowanceData,
) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/allowances/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deleteAllowanceAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/allowances/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

