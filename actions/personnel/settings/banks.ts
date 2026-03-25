"use server";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/actions/base";

export interface Bank {
  id: string;
  name: string;
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

export interface PaginatedBankData {
  data: Bank[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateBankData {
  name: string;
}

export interface UpdateBankData {
  name?: string;
}

export async function listBanksAction(page?: number, pageSize?: number) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedBankData;
  }>("personnel/settings/banks/", {
    params,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createBankAction(name: string) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/banks/create/", {
    name,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function retrieveBankAction(id: string) {
  const result = await apiGet<{
    error: boolean;
    message: Bank;
  }>(`personnel/settings/banks/${id}/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updateBankAction(id: string, data: UpdateBankData) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/banks/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deleteBankAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/banks/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

