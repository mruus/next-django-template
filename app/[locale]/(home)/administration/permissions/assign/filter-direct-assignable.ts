import type { AssignableCustomPermissionItem } from "@/actions/core/permissions";

/**
 * Drops permission leaves that are only satisfied via groups (no direct row).
 * Keeps folders when any descendant stays visible; adds ancestor chain.
 */
export function filterAssignableItemsForUserDirectTree(
  items: AssignableCustomPermissionItem[],
): AssignableCustomPermissionItem[] {
  if (!items.length) return [];

  const childrenByParent = new Map<
    string | null,
    AssignableCustomPermissionItem[]
  >();
  for (const it of items) {
    const k = it.tn_parent_id ?? null;
    if (!childrenByParent.has(k)) childrenByParent.set(k, []);
    childrenByParent.get(k)!.push(it);
  }

  const memo = new Map<string, boolean>();

  function subtreeVisible(id: string): boolean {
    if (memo.has(id)) return memo.get(id)!;
    const node = items.find((x) => x.id === id);
    if (!node) {
      memo.set(id, false);
      return false;
    }
    if (node.permission) {
      const groupOnly =
        node.inherited_checked === true && node.direct_checked !== true;
      memo.set(id, !groupOnly);
      return !groupOnly;
    }
    const kids = childrenByParent.get(id) ?? [];
    const vis = kids.some((k) => subtreeVisible(k.id));
    memo.set(id, vis);
    return vis;
  }

  const visibleNodeIds = new Set(
    items.filter((it) => subtreeVisible(it.id)).map((it) => it.id),
  );

  const byId = new Map(items.map((i) => [i.id, i]));
  const withAncestors = new Set(visibleNodeIds);
  for (const id of visibleNodeIds) {
    let p = byId.get(id)?.tn_parent_id ?? null;
    while (p) {
      withAncestors.add(p);
      p = byId.get(p)?.tn_parent_id ?? null;
    }
  }

  return items.filter((i) => withAncestors.has(i.id));
}
