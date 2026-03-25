"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ArboristNode = {
  id: string;
  name?: string;
  children?: ArboristNode[];
  [key: string]: unknown;
};

type TreeProps<T extends ArboristNode> = {
  initialData: T[];
  height?: number;
  width?: number | string;
  openByDefault?: boolean;
  selectedId?: string | null;
  onSelectId?: (id: string | null) => void;
  disabledIds?: Set<string>;
  renderLabel?: (nodeData: T) => ReactNode;
  showToolbar?: boolean;
  showSearch?: boolean;
  toolbarActions?: ReactNode;
};

function TreeInner<T extends ArboristNode>({
  nodes,
  level,
  expanded,
  toggle,
  selectedId,
  onSelect,
  disabledIds,
  renderLabel,
  searchHighlight,
}: {
  nodes: T[];
  level: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabledIds: Set<string>;
  renderLabel?: (nodeData: T) => ReactNode;
  searchHighlight: string;
}) {
  if (!nodes.length) return null;

  return (
    <ul className="parent__container list-none ps-0 ms-0 space-y-1">
      {nodes.map((node) => {
        const id = String(node.id);
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        const isExpanded = expanded.has(id);
        const isSelected = selectedId === id;
        const isDisabled = disabledIds.has(id);
        const isHighlighted =
          searchHighlight &&
          String((node as ArboristNode).name ?? "").toLowerCase().includes(searchHighlight.toLowerCase());

        return (
          <li
            key={id}
            className={cn(
              "tree__node relative",
              hasChildren ? "children__node" : "no__children__node",
            )}
          >
            <div
              className={cn(
                "node__content flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer select-none border border-transparent",
                isSelected && "bg-primary/10 border-primary/20",
                !isSelected && !isDisabled && "hover:bg-muted/60",
                isDisabled && "opacity-50 cursor-not-allowed",
              )}
              onClick={() => {
                if (isDisabled) return;
                onSelect(id);
              }}
            >
              <span
                className="flex items-center shrink-0 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDisabled) return;
                  if (hasChildren) toggle(id);
                }}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronRight size={16} className="text-muted-foreground" />
                  )
                ) : (
                  <span className="w-4 inline-block" />
                )}
              </span>
              <span
                className={cn(
                  "text-sm truncate flex-1 min-w-0",
                  isHighlighted && "bg-primary/20 font-medium rounded px-1",
                )}
              >
                {renderLabel ? renderLabel(node) : (node.name as string) ?? id}
              </span>
            </div>
            {hasChildren && (
              <div className={cn("ms-5 border-s border-dashed border-muted-foreground/30", !isExpanded && "hidden")}>
                <TreeInner
                  nodes={node.children as T[]}
                  level={level + 1}
                  expanded={expanded}
                  toggle={toggle}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  disabledIds={disabledIds}
                  renderLabel={renderLabel}
                  searchHighlight={searchHighlight}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function collectAllIds<T extends ArboristNode>(nodes: T[]): Set<string> {
  const out = new Set<string>();
  function visit(n: T) {
    out.add(String(n.id));
    (n.children ?? []).forEach((c) => visit(c as T));
  }
  nodes.forEach(visit);
  return out;
}

export default function ArboristTree<T extends ArboristNode>({
  initialData,
  height = 420,
  width = "100%",
  openByDefault = true,
  selectedId,
  onSelectId,
  disabledIds,
  renderLabel,
  showToolbar = true,
  showSearch = true,
  toolbarActions,
}: TreeProps<T>) {
  const list = Array.isArray(initialData) ? initialData : [];
  const allIds = useMemo(() => collectAllIds(list), [list]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHighlight, setSearchHighlight] = useState("");
  const didInitialExpand = useRef(false);

  useEffect(() => {
    if (openByDefault && allIds.size > 0 && !didInitialExpand.current) {
      didInitialExpand.current = true;
      setExpanded(allIds);
    }
  }, [openByDefault, allIds]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(allIds));
  }, [allIds]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const onSearch = useCallback(() => {
    setSearchHighlight(searchQuery);
  }, [searchQuery]);

  const heightStyle =
    typeof height === "number"
      ? { height: `${height}px` }
      : { minHeight: height };

  return (
    <div
      className="tree__container flex min-h-[90vh] flex-col overflow-hidden text-sm"
      style={{ width, ...heightStyle }}
    >
      {showToolbar && (
        <div className="tree__actions mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 bg-background pb-2">
          {toolbarActions && <div className="flex items-center gap-2">{toolbarActions}</div>}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={expandAll}>
              Expand all
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
              Collapse all
            </Button>
            {showSearch && (
              <div className="flex items-center gap-1">
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSearch()}
                  className="h-8 w-40"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={onSearch}
                >
                  <Search size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-muted/20 p-2">
        <TreeInner
          nodes={list}
          level={0}
          expanded={expanded}
          toggle={toggle}
          selectedId={selectedId ?? null}
          onSelect={(id) => onSelectId?.(id)}
          disabledIds={disabledIds ?? new Set()}
          renderLabel={renderLabel}
          searchHighlight={searchHighlight}
        />
      </div>
    </div>
  );
}
