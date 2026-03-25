"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

import {
  applyGroupPermissionsDeltaAction,
  listAssignableCustomPermissionsForGroupAction,
} from "@/actions/core/permissions";

import {
  AssignablePermissionsTree,
  buildCheckedIdsFromAssignableItems,
} from "../../../components/assignable-permissions-tree";

import { diffPermissionSelections, setsEqual } from "./permission-selection-utils";
import { GroupPermissionsToolbar } from "./group-permissions-toolbar";

export function GroupPermissionsContent() {
  const t = useTranslations("administration.permissions.groups");
  const queryClient = useQueryClient();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params?.groupId);

  const [baselineIds, setBaselineIds] = useState<Set<number>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ["assignable-custom-permissions", "group", groupId],
    queryFn: async () => {
      const result = await listAssignableCustomPermissionsForGroupAction(groupId);
      if (!result.success || result.data?.error) {
        throw new Error("Failed to fetch permissions");
      }
      return result.data?.message.permissions || [];
    },
    enabled: Number.isFinite(groupId),
  });

  useEffect(() => {
    if (!permissionsData?.length) {
      setBaselineIds(new Set());
      setSelectedIds(new Set());
      return;
    }
    const next = buildCheckedIdsFromAssignableItems(permissionsData);
    setBaselineIds(new Set(next));
    setSelectedIds(new Set(next));
  }, [permissionsData]);

  const isDirty = useMemo(
    () => !setsEqual(selectedIds, baselineIds),
    [selectedIds, baselineIds],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { addPermissionIds, removePermissionIds } = diffPermissionSelections(
        baselineIds,
        selectedIds,
      );
      const result = await applyGroupPermissionsDeltaAction(groupId, {
        addPermissionIds,
        removePermissionIds,
      });
      if (!result.success) {
        throw new Error(result.error || t("toasts.error"));
      }
      if (result.data?.error) {
        throw new Error(t("toasts.error"));
      }
      return result;
    },
    onSuccess: () => {
      toast.success(t("toasts.permissionsSaveSuccess"));
      queryClient.invalidateQueries({ queryKey: ["groups"], exact: false });
      queryClient.invalidateQueries({
        queryKey: ["assignable-custom-permissions", "group", groupId],
      });
    },
    onError: (err: Error) => toast.error(err.message || t("toasts.error")),
  });

  const handleReset = useCallback(() => {
    setSelectedIds(new Set(baselineIds));
  }, [baselineIds]);

  const handleSave = useCallback(() => {
    const { addPermissionIds, removePermissionIds } = diffPermissionSelections(
      baselineIds,
      selectedIds,
    );
    if (addPermissionIds.length === 0 && removePermissionIds.length === 0) {
      return;
    }
    saveMutation.mutate();
  }, [baselineIds, selectedIds, saveMutation]);

  return (
    <div className="space-y-4">
      <GroupPermissionsToolbar
        selectedCount={selectedIds.size}
        isDirty={isDirty}
        isSaving={saveMutation.isPending}
        onReset={handleReset}
        onSave={handleSave}
      />
      <AssignablePermissionsTree
        items={permissionsData}
        isLoading={isLoading}
        treeKey={groupId}
        checkedPermissionIds={selectedIds}
        onCheckedPermissionIdsChange={setSelectedIds}
      />
    </div>
  );
}
