"use server";

import { apiDelete, apiGet, apiPost, apiPut } from "@/actions/base";

export interface Location {
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

export interface CreateLocationData {
  name: string;
  label: string;
  tn_parent: string | null;
}

export interface UpdateLocationData {
  name?: string;
  label?: string;
}

export async function listLocationsAction() {
  const result = await apiGet<{
    error: boolean;
    message: Location[];
  }>("personnel/settings/locations/");

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function createLocationAction(data: CreateLocationData) {
  const result = await apiPost<{
    error: boolean;
    message: string;
  }>("personnel/settings/locations/create/", data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function updateLocationAction(id: string, data: UpdateLocationData) {
  const result = await apiPut<{
    error: boolean;
    message: string;
  }>(`personnel/settings/locations/${id}/update/`, data);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function deleteLocationAction(id: string) {
  const result = await apiDelete<{
    error: boolean;
    message: string;
  }>(`personnel/settings/locations/${id}/delete/`);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

