"use server";

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/actions/base";

export interface Label {
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

export interface PaginatedLabelData {
  data: Label[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateLabelData {
  name: string;
  type: string;
}

export interface UpdateLabelData {
  name?: string;
  type?: string;
}

// List all labels
export async function listLabelsAction(page?: number, pageSize?: number) {
  const params: Record<string, string | number | undefined> = {};
  if (page !== undefined) params.page = page;
  if (pageSize !== undefined) params.page_size = pageSize;

  const result = await apiGet<{
    error: boolean;
    message: PaginatedLabelData;
  }>("personnel/settings/labels/", {
    params,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Create new label
export async function createLabelAction(name: string, type: string) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/labels/create/", {
    name,
    type,
  });

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Retrieve specific label by ID
export async function retrieveLabelAction(id: string) {
  const result = await apiGet<{
    error: boolean;
    message: Label;
  }>(`personnel/settings/labels/${id}/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Update label by ID
export async function updateLabelAction(id: string, data: UpdateLabelData) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/labels/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Partial update label by ID
export async function partialUpdateLabelAction(
  id: string,
  data: UpdateLabelData,
) {
  const result = await apiPatch<{
    error: boolean;
    message: string;
  }>(`personnel/settings/labels/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Delete label by ID
export async function deleteLabelAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/labels/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}
