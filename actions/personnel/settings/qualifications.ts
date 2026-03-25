"use server";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/actions/base";

export interface Qualification {
  id: string;
  name: string;
  type: string;
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

export interface PaginatedQualificationData {
  data: Qualification[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateQualificationData {
  name: string;
  type: string;
}

export interface UpdateQualificationData {
  name?: string;
  type?: string;
}

export async function listQualificationsAction(
  page?: number,
  pageSize?: number,
) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedQualificationData;
  }>("personnel/settings/qualifications/", {
    params,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createQualificationAction(name: string, type: string) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/qualifications/create/", {
    name,
    type,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function retrieveQualificationAction(id: string) {
  const result = await apiGet<{
    error: boolean;
    message: Qualification;
  }>(`personnel/settings/qualifications/${id}/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updateQualificationAction(
  id: string,
  data: UpdateQualificationData,
) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/qualifications/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function partialUpdateQualificationAction(
  id: string,
  data: UpdateQualificationData,
) {
  const result = await apiPatch<{
    error: boolean;
    message: string;
  }>(`personnel/settings/qualifications/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deleteQualificationAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/qualifications/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

