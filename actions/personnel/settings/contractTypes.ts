"use server";

import { apiDelete, apiGet, apiPut, apiPost } from "@/actions/base";

export interface ContractType {
  id: string;
  name: string;
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

export interface PaginatedContractTypeData {
  data: ContractType[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateContractTypeData {
  name: string;
  description?: string;
}

export interface UpdateContractTypeData {
  name?: string;
  description?: string | null;
}

export async function listContractTypesAction(
  page?: number,
  pageSize?: number,
) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedContractTypeData;
  }>("personnel/settings/contractTypes/", {
    params,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createContractTypeAction(
  name: string,
  description?: string,
) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/contractTypes/create/", {
    name,
    description,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function retrieveContractTypeAction(id: string) {
  const result = await apiGet<{
    error: boolean;
    message: ContractType;
  }>(`personnel/settings/contractTypes/${id}/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updateContractTypeAction(
  id: string,
  data: UpdateContractTypeData,
) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/contractTypes/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deleteContractTypeAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/contractTypes/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

