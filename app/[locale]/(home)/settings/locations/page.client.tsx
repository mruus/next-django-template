"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import ArboristTree, { type ArboristNode } from "../../components/arborist-tree";
import { ConfirmationDialog } from "../../components/confirmation-dialog";
import { Button } from "@/components/ui/button";

import {
  type Location,
  deleteLocationAction,
  listLocationsAction,
} from "@/actions/personnel/settings/locations";
import { listLabelsAction, type Label } from "@/actions/personnel/settings/labels";
import LocationDrawer from "./components/location-drawer";

export default function LocationsPage() {
  const t = useTranslations("settings.locations");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const drawerDirection = locale === "ar" ? "right" : "left";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedNode, setSelectedNode] = useState<Location | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  const [treeSelectedId, setTreeSelectedId] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<Location | null>(null);

  const { data: locationsData, isLoading: isTreeLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => listLocationsAction(),
  });

  const nodes: Location[] = locationsData?.data?.message || [];

  const { data: labelsData } = useQuery({
    queryKey: ["labels", "options"],
    queryFn: () => listLabelsAction(1, 1000),
  });

  const labels: Label[] = labelsData?.data?.message?.data || [];
  const locationLabels = useMemo(
    () => labels.filter((l) => l.type === "location"),
    [labels],
  );

  const selectedNodeFromId = useMemo(() => {
    if (!treeSelectedId) return null;
    return nodes.find((n) => n.id === treeSelectedId) || null;
  }, [treeSelectedId, nodes]);

  useEffect(() => {
    if (!treeSelectedId) return;
    if (!selectedNodeFromId) setTreeSelectedId(null);
  }, [treeSelectedId, selectedNodeFromId]);

  const treeInitialData: ArboristNode[] = useMemo(() => {
    const childrenByParent = new Map<string | null, Location[]>();

    for (const n of nodes) {
      const key = n.tn_parent ?? null;
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key)!.push(n);
    }

    const build = (parentId: string | null): ArboristNode[] => {
      const kids = childrenByParent.get(parentId) || [];
      return kids.map((k) => {
        const childNodes = build(k.id);
        const node: ArboristNode = {
          id: k.id,
          name: k.name,
          label: k.label,
          label_display: k.label_display,
          tn_parent: k.tn_parent,
          tn_level: k.tn_level,
          tn_priority: k.tn_priority,
        };
        if (childNodes.length > 0) node.children = childNodes;
        return node;
      });
    };

    return build(null);
  }, [nodes]);

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await deleteLocationAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setDeleteDialogOpen(false);
      setNodeToDelete(null);
      setTreeSelectedId(null);
    },
    onError: (err) => toast.error(err.message || t("toasts.error")),
  });

  const openCreateDrawer = (parentId: string | null) => {
    setDrawerMode("create");
    setSelectedNode(null);
    setCreateParentId(parentId);
    setDrawerOpen(true);
  };

  const openEditDrawer = () => {
    if (!selectedNodeFromId) return;
    setDrawerMode("edit");
    setSelectedNode(selectedNodeFromId);
    setCreateParentId(null);
    setDrawerOpen(true);
  };

  const openDeleteDialog = () => {
    if (!selectedNodeFromId) return;
    setNodeToDelete(selectedNodeFromId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!nodeToDelete) return;
    deleteMutation.mutate(nodeToDelete.id);
  };

  return (
    <div className="space-y-4">
      {isTreeLoading ? (
        <div className="py-10 text-center text-muted-foreground">Loading...</div>
      ) : (
        <ArboristTree
          initialData={treeInitialData}
          openByDefault
          height={520}
          selectedId={treeSelectedId}
          onSelectId={(id) => setTreeSelectedId(id)}
          toolbarActions={
            <>
              <Button
                type="button"
                size="icon"
                variant="default"
                aria-label={t("addRootNode")}
                title={t("addRootNode")}
                onClick={() => openCreateDrawer(null)}
              >
                <FolderPlus size={16} />
              </Button>
              {nodes.length > 0 && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={t("addChild")}
                  title={t("addChild")}
                  onClick={() => openCreateDrawer(selectedNodeFromId?.id ?? null)}
                  disabled={!selectedNodeFromId}
                >
                  <Plus size={16} />
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={commonT("edit")}
                title={commonT("edit")}
                onClick={openEditDrawer}
                disabled={!selectedNodeFromId}
              >
                <Pencil size={16} />
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label={commonT("delete")}
                title={commonT("delete")}
                onClick={openDeleteDialog}
                disabled={!selectedNodeFromId}
              >
                <Trash2 size={16} />
              </Button>
            </>
          }
          renderLabel={(nodeData) => (
            <span className="flex flex-col">
              <span>{(nodeData.name as string) || ""}</span>
              <span className="text-xs text-muted-foreground truncate">
                {(nodeData.label_display as string) || ""}
              </span>
            </span>
          )}
        />
      )}

      <LocationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedNode={selectedNode}
        createParentId={createParentId}
        createParentName={selectedNodeFromId?.name || null}
        direction={drawerDirection}
        labels={locationLabels}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("confirmDeleteTitle")}
        description={t("confirmDeleteDescription")}
        status="danger"
        confirmText={commonT("confirm")}
        cancelText={commonT("cancel")}
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

