"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useTranslations } from "next-intl";

import ArboristTree, {
  type ArboristNode,
} from "../../../components/arborist-tree";
import type { AssignableCustomPermissionItem } from "@/actions/core/permissions";
import { cn } from "@/lib/utils";

export type AssignablePermissionTreeNode = AssignableCustomPermissionItem &
  ArboristNode & {
    children?: AssignablePermissionTreeNode[];
  };

function buildAssignableTree(
  items: AssignableCustomPermissionItem[],
): AssignablePermissionTreeNode[] {
  const childrenByParent = new Map<
    string | null,
    AssignableCustomPermissionItem[]
  >();
  const sorted = [...items].sort((a, b) => a.tn_order - b.tn_order);

  for (const n of sorted) {
    const key = n.tn_parent_id ?? null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(n);
  }

  const build = (parentId: string | null): AssignablePermissionTreeNode[] => {
    const kids = childrenByParent.get(parentId) || [];
    return kids.map((k) => {
      const children = childrenByParent.get(k.id) || [];
      const node: AssignablePermissionTreeNode = {
        ...k,
        name: k.permission?.codename ?? k.name,
      };
      if (children.length > 0) {
        node.children = build(k.id);
      }
      return node;
    });
  };

  return build(null);
}

/**
 * All Django permission ids under `node` (any depth), depth-first: children
 * first, then this node. Deduped so nested rollups stay consistent.
 */
function collectSubtreePermissionIds(
  node: AssignablePermissionTreeNode,
): number[] {
  const seen = new Set<number>();
  const order: number[] = [];

  function dfs(n: AssignablePermissionTreeNode) {
    for (const child of n.children ?? []) {
      dfs(child);
    }
    const pid = n.permission?.id;
    if (pid != null && !seen.has(pid)) {
      seen.add(pid);
      order.push(pid);
    }
  }

  dfs(node);
  return order;
}

function subtreeSelectionFlags(
  subtreePermissionIds: number[],
  selected: Set<number>,
) {
  if (subtreePermissionIds.length === 0) {
    return { allChecked: false, someChecked: false, partial: false };
  }
  const allChecked = subtreePermissionIds.every((id) => selected.has(id));
  const someChecked = subtreePermissionIds.some((id) => selected.has(id));
  const partial = someChecked && !allChecked;
  return { allChecked, someChecked, partial };
}

function buildDescendantPermissionMap(
  nodes: AssignablePermissionTreeNode[],
  map = new Map<string, number[]>(),
): Map<string, number[]> {
  for (const n of nodes) {
    map.set(n.id, collectSubtreePermissionIds(n));
    if (n.children?.length) {
      buildDescendantPermissionMap(n.children, map);
    }
  }
  return map;
}

function checkedSetFromItems(items: AssignableCustomPermissionItem[]) {
  const next = new Set<number>();
  for (const item of items) {
    if (item.permission?.id && item.checked) {
      next.add(item.permission.id);
    }
  }
  return next;
}

function PermCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
  className,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.indeterminate = Boolean(!checked && indeterminate);
  }, [checked, indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={className}
      aria-label={ariaLabel}
    />
  );
}

type AssignablePermissionsTreeProps = {
  items: AssignableCustomPermissionItem[] | undefined;
  isLoading?: boolean;
  height?: number;
  treeKey?: string | number;
  checkedPermissionIds?: Set<number>;
  onCheckedPermissionIdsChange?: Dispatch<SetStateAction<Set<number>>>;
};

export function AssignablePermissionsTree({
  items,
  isLoading = false,
  height = 520,
  treeKey,
  checkedPermissionIds: controlledChecked,
  onCheckedPermissionIdsChange,
}: AssignablePermissionsTreeProps) {
  const t = useTranslations("administration.permissions.groups");
  const [internalChecked, setInternalChecked] = useState<Set<number>>(
    () => new Set(),
  );

  const isControlled =
    controlledChecked !== undefined && onCheckedPermissionIdsChange !== undefined;

  useEffect(() => {
    if (isControlled || !items?.length) {
      if (!isControlled && !items?.length) setInternalChecked(new Set());
      return;
    }
    setInternalChecked(checkedSetFromItems(items));
  }, [items, isControlled]);

  const checkedPermissionIds = isControlled ? controlledChecked! : internalChecked;

  const applyPatch = useCallback(
    (patch: (prev: Set<number>) => Set<number>) => {
      if (isControlled) {
        onCheckedPermissionIdsChange!(patch);
      } else {
        setInternalChecked(patch);
      }
    },
    [isControlled, onCheckedPermissionIdsChange],
  );

  const toggleSubtreePermissionIds = useCallback(
    (permissionIds: number[]) => {
      applyPatch((prev) => {
        const next = new Set(prev);
        const allOn =
          permissionIds.length > 0 &&
          permissionIds.every((id) => next.has(id));
        if (allOn) {
          permissionIds.forEach((id) => next.delete(id));
        } else {
          permissionIds.forEach((id) => next.add(id));
        }
        return next;
      });
    },
    [applyPatch],
  );

  const treeData = useMemo(
    () => (items?.length ? buildAssignableTree(items) : []),
    [items],
  );

  const descendantPermissionIdsByNodeId = useMemo(
    () => buildDescendantPermissionMap(treeData),
    [treeData],
  );

  const renderLabel = useCallback(
    (nodeData: AssignablePermissionTreeNode) => {
      const node = nodeData;
      const subtreeIds = descendantPermissionIdsByNodeId.get(node.id) ?? [];

      if (subtreeIds.length === 0) {
        return (
          <div
            className="flex min-w-0 flex-1 items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">
              {node.permission?.codename ?? node.name}
            </span>
          </div>
        );
      }

      const { allChecked, partial } = subtreeSelectionFlags(
        subtreeIds,
        checkedPermissionIds,
      );

      return (
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <PermCheckbox
            checked={allChecked}
            indeterminate={partial}
            onChange={() => toggleSubtreePermissionIds(subtreeIds)}
            ariaLabel={node.permission?.codename ?? node.name}
            className={cn(
              "h-4 w-4 shrink-0 rounded border-input accent-primary",
            )}
          />
          <span className="min-w-0 truncate">
            {node.permission?.codename ?? node.name}
          </span>
        </div>
      );
    },
    [
      checkedPermissionIds,
      descendantPermissionIdsByNodeId,
      toggleSubtreePermissionIds,
    ],
  );

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        {t("noPermissionsFound")}
      </div>
    );
  }

  return (
    <ArboristTree<AssignablePermissionTreeNode>
      key={treeKey != null ? String(treeKey) : undefined}
      initialData={treeData}
      openByDefault
      height={height}
      showSearch={false}
      selectedId={null}
      onSelectId={() => {}}
      renderLabel={renderLabel}
    />
  );
}

export function buildCheckedIdsFromAssignableItems(
  items: AssignableCustomPermissionItem[],
): Set<number> {
  return checkedSetFromItems(items);
}

export function buildDirectCheckedIdsFromAssignableItems(
  items: AssignableCustomPermissionItem[],
): Set<number> {
  const next = new Set<number>();
  for (const item of items) {
    if (item.permission?.id && item.direct_checked) {
      next.add(item.permission.id);
    }
  }
  return next;
}
