export function setsEqual(a: Set<number>, b: Set<number>) {
  if (a.size !== b.size) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}

export function diffPermissionSelections(
  baseline: Set<number>,
  current: Set<number>,
) {
  const addPermissionIds: number[] = [];
  const removePermissionIds: number[] = [];
  for (const id of current) {
    if (!baseline.has(id)) addPermissionIds.push(id);
  }
  for (const id of baseline) {
    if (!current.has(id)) removePermissionIds.push(id);
  }
  return { addPermissionIds, removePermissionIds };
}
