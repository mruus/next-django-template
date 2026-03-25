"use server";

import { apiDelete, apiGet, apiPut, apiPost, apiPatch } from "@/actions/base";

export interface JobTitle {
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

export interface PaginatedJobTitleData {
  data: JobTitle[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateJobTitleData {
  name: string;
  description?: string;
}

export interface UpdateJobTitleData {
  name?: string;
  description?: string | null;
}

export async function listJobTitlesAction(page?: number, pageSize?: number) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedJobTitleData;
  }>("personnel/settings/jobTitles/", { params });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createJobTitleAction(data: CreateJobTitleData) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/jobTitles/create/", data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updateJobTitleAction(
  id: string,
  data: UpdateJobTitleData,
) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/jobTitles/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deleteJobTitleAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/jobTitles/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

