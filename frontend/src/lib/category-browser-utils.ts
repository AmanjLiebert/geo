import type { CategoryDisplayState, ManagedCategory } from "./category-management-api";

export type CategoryBrowserStatus = "all" | CategoryDisplayState;

export function shouldRevealCategoryChildren(
  isManuallyExpanded: boolean,
  rawQuery: string,
  status: CategoryBrowserStatus,
): boolean {
  return isManuallyExpanded || rawQuery.trim().length > 0 || status !== "all";
}

function textMatches(item: ManagedCategory, query: string): boolean {
  if (!query) return true;
  return [item.name, item.summary ?? "", item.description ?? ""]
    .join(" ")
    .toLocaleLowerCase()
    .includes(query);
}

function statusMatches(item: ManagedCategory, status: CategoryBrowserStatus): boolean {
  return status === "all" || item.displayState === status;
}

export function filterCategoryHierarchy(
  items: ManagedCategory[],
  rawQuery: string,
  status: CategoryBrowserStatus,
): ManagedCategory[] {
  const query = rawQuery.trim().toLocaleLowerCase();
  const roots = items.filter((item) => item.parentId === null);
  const visible = new Set<string>();

  for (const root of roots) {
    const rootTextMatches = textMatches(root, query);
    const rootDirectMatch = rootTextMatches && statusMatches(root, status);
    const children = items.filter((item) => item.parentId === root.id);
    const matchingChildren = children.filter(
      (child) =>
        statusMatches(child, status) &&
        (!query || rootTextMatches || textMatches(child, query)),
    );
    if (rootDirectMatch || matchingChildren.length > 0) visible.add(root.id);
    for (const child of matchingChildren) visible.add(child.id);
  }

  return items.filter((item) => visible.has(item.id));
}
