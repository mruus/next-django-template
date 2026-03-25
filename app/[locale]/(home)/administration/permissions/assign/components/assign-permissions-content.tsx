"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

import {
  UserSearch,
  type UserSearchHit,
} from "../../../../components/user-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  applyUserDirectPermissionsDeltaAction,
  listAssignableCustomPermissionsForUserAction,
} from "@/actions/core/permissions";
import {
  applyUserGroupsDeltaAction,
  getUserGroupIdsAction,
} from "@/actions/core/users";
import { listGroupsAction } from "@/actions/core/groups";

import {
  AssignablePermissionsTree,
  buildDirectCheckedIdsFromAssignableItems,
} from "../../components/assignable-permissions-tree";
import { filterAssignableItemsForUserDirectTree } from "../filter-direct-assignable";
import {
  diffPermissionSelections,
  setsEqual,
} from "../../groups/[groupId]/components/permission-selection-utils";

export function AssignPermissionsContent() {
  const t = useTranslations("administration.permissions.assign");
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<UserSearchHit | null>(null);
  const userId = selectedUser?.id ?? null;

  const [baselineGroupIds, setBaselineGroupIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(
    () => new Set(),
  );

  const [baselineDirectIds, setBaselineDirectIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [selectedDirectIds, setSelectedDirectIds] = useState<Set<number>>(
    () => new Set(),
  );

  const { data: groupsList = [] } = useQuery({
    queryKey: ["groups", "assign-list"],
    queryFn: async () => {
      const result = await listGroupsAction(1, 500);
      if (!result.success || result.data?.error) {
        throw new Error("Failed to load groups");
      }
      return result.data?.message.data ?? [];
    },
    enabled: Boolean(userId),
  });

  const { data: userGroupIdsData } = useQuery({
    queryKey: ["user-group-ids", userId],
    queryFn: async () => {
      const result = await getUserGroupIdsAction(userId!);
      if (!result.success || result.data?.error) {
        throw new Error("Failed to load user groups");
      }
      return result.data?.message.group_ids ?? [];
    },
    enabled: Boolean(userId),
  });

  const {
    data: fullAssignableRaw,
    isLoading: assignableLoading,
    isSuccess: assignableReady,
  } = useQuery({
    queryKey: ["assignable-custom-permissions", "user", userId],
    queryFn: async () => {
      const result = await listAssignableCustomPermissionsForUserAction(
        userId!,
      );
      if (!result.success || result.data?.error) {
        throw new Error("Failed to load permissions");
      }
      return result.data?.message.permissions ?? [];
    },
    enabled: Boolean(userId),
  });

  const fullAssignable = fullAssignableRaw ?? [];

  const filteredAssignable = useMemo(
    () => filterAssignableItemsForUserDirectTree(fullAssignable),
    [fullAssignable],
  );

  useEffect(() => {
    if (!userId) {
      setBaselineGroupIds(new Set());
      setSelectedGroupIds(new Set());
      setBaselineDirectIds(new Set());
      setSelectedDirectIds(new Set());
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || userGroupIdsData === undefined) return;
    const next = new Set(userGroupIdsData);
    setBaselineGroupIds(new Set(next));
    setSelectedGroupIds(new Set(next));
  }, [userId, userGroupIdsData]);

  useEffect(() => {
    if (!userId || !assignableReady || fullAssignableRaw === undefined) return;
    const next = buildDirectCheckedIdsFromAssignableItems(fullAssignableRaw);
    setBaselineDirectIds(new Set(next));
    setSelectedDirectIds(new Set(next));
  }, [userId, assignableReady, fullAssignableRaw]);

  const groupsDirty = useMemo(
    () => !setsEqual(selectedGroupIds, baselineGroupIds),
    [selectedGroupIds, baselineGroupIds],
  );

  const directDirty = useMemo(
    () => !setsEqual(selectedDirectIds, baselineDirectIds),
    [selectedDirectIds, baselineDirectIds],
  );

  const isDirty = groupsDirty || directDirty;

  const toggleGroup = useCallback((groupId: number) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error(t("toasts.error"));

      if (groupsDirty) {
        const g = diffPermissionSelections(baselineGroupIds, selectedGroupIds);
        const r = await applyUserGroupsDeltaAction(userId, {
          addGroupIds: g.addPermissionIds,
          removeGroupIds: g.removePermissionIds,
        });
        if (!r.success) throw new Error(r.error || t("toasts.error"));
        if (r.data?.error) throw new Error(t("toasts.error"));
      }

      if (directDirty) {
        const d = diffPermissionSelections(
          baselineDirectIds,
          selectedDirectIds,
        );
        const r2 = await applyUserDirectPermissionsDeltaAction(userId, {
          addPermissionIds: d.addPermissionIds,
          removePermissionIds: d.removePermissionIds,
        });
        if (!r2.success) throw new Error(r2.error || t("toasts.error"));
        if (r2.data?.error) throw new Error(t("toasts.error"));
      }
    },
    onSuccess: () => {
      toast.success(t("toasts.saveSuccess"));
      queryClient.invalidateQueries({ queryKey: ["user-group-ids", userId] });
      queryClient.invalidateQueries({
        queryKey: ["assignable-custom-permissions", "user", userId],
      });
      queryClient.invalidateQueries({ queryKey: ["groups"], exact: false });
      queryClient.invalidateQueries({
        queryKey: ["permissions"],
        exact: false,
      });
    },
    onError: (err: Error) => toast.error(err.message || t("toasts.error")),
  });

  const handleReset = useCallback(() => {
    setSelectedGroupIds(new Set(baselineGroupIds));
    setSelectedDirectIds(new Set(baselineDirectIds));
  }, [baselineGroupIds, baselineDirectIds]);

  const handleSave = useCallback(() => {
    if (!isDirty) return;
    saveMutation.mutate();
  }, [isDirty, saveMutation]);

  const handleClearUser = useCallback(() => {
    setSelectedUser(null);
    setBaselineGroupIds(new Set());
    setSelectedGroupIds(new Set());
    setBaselineDirectIds(new Set());
    setSelectedDirectIds(new Set());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        {/* <h1 className="text-2xl font-semibold">{t("title")}</h1> */}
        <UserSearch
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          onClear={handleClearUser}
        />
      </div>

      {userId && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {t("selectedDirectCount", { count: selectedDirectIds.size })}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!isDirty || saveMutation.isPending}
              >
                {t("reset")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || saveMutation.isPending}
              >
                {t("save")}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("groupsTitle")}</CardTitle>
              <CardDescription>{t("groupsHint")}</CardDescription>
            </CardHeader>
            <CardContent className="max-h-64 space-y-2 overflow-y-auto">
              {groupsList.map((g) => (
                <label
                  key={g.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-2 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selectedGroupIds.has(g.id)}
                    onChange={() => toggleGroup(g.id)}
                  />
                  <span className="flex-1 font-medium">{g.name}</span>
                  <Badge variant="secondary">
                    {t("permissionCount", { count: g.permissions_count })}
                  </Badge>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("directTitle")}</CardTitle>
              <CardDescription>{t("directHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignablePermissionsTree
                items={assignableReady ? filteredAssignable : undefined}
                isLoading={
                  assignableLoading || (Boolean(userId) && !assignableReady)
                }
                treeKey={userId}
                checkedPermissionIds={selectedDirectIds}
                onCheckedPermissionIdsChange={setSelectedDirectIds}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
