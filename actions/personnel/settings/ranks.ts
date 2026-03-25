"use server";

import { apiDelete, apiGet, apiPut, apiPost } from "@/actions/base";

export interface Rank {
  id: string;
  name: string;
  months_of_service: number;
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

export interface PaginatedRankData {
  data: Rank[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateRankData {
  name: string;
  months_of_service: number;
}

export interface UpdateRankData {
  name?: string;
  months_of_service?: number;
}

export async function listRanksAction(page?: number, pageSize?: number) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedRankData;
  }>("personnel/settings/ranks/", {
    params,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createRankAction(
  name: string,
  months_of_service: number,
) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/ranks/create/", {
    name,
    months_of_service,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function retrieveRankAction(id: string) {
  const result = await apiGet<{
    error: boolean;
    message: Rank;
  }>(`personnel/settings/ranks/${id}/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updateRankAction(
  id: string,
  data: UpdateRankData,
) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/ranks/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deleteRankAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/ranks/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

