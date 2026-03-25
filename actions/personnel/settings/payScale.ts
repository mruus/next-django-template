"use server";

import { apiDelete, apiGet, apiPut, apiPost, apiPatch } from "@/actions/base";

export interface PayScale {
  id: string;
  rank: string;
  rank_display: string;
  contract_type: string;
  contract_type_display: string;
  salary: number;
  iida: number;
  deduction: number;
  insurance: number;
  age_of_retirement: number;
  slug: string;
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

export interface PaginatedPayScaleData {
  data: PayScale[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreatePayScaleData {
  rank: string;
  contract_type: string;
  salary: number;
  iida: number;
  deduction: number;
  insurance: number;
  age_of_retirement: number;
  slug?: string;
}

export interface UpdatePayScaleData {
  rank?: string;
  contract_type?: string;
  salary?: number;
  iida?: number;
  deduction?: number;
  insurance?: number;
  age_of_retirement?: number;
  slug?: string;
}

export async function listPayScalesAction(page?: number, pageSize?: number) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedPayScaleData;
  }>("personnel/settings/payScale/", { params });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createPayScaleAction(data: CreatePayScaleData) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/payScale/create/", data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function retrievePayScaleAction(id: string) {
  const result = await apiGet<{
    error: boolean;
    message: PayScale;
  }>(`personnel/settings/payScale/${id}/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updatePayScaleAction(
  id: string,
  data: UpdatePayScaleData,
) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/payScale/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deletePayScaleAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/payScale/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

