"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Save,
  Eye,
  EyeOff,
  Key,
  FolderTree,
  Link,
  Unlink,
  FolderPlus,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { ConfirmationDialog } from "../../../components/confirmation-dialog";
import { useHasPermission } from "@/app/[locale]/(home)/components/use-has-permission";

import ArboristTree, {
  type ArboristNode,
} from "../../../components/arborist-tree";
import { apiDelete, apiGet, apiPost, apiPut } from "@/actions/base";

// Types
interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: {
    id: number;
    app_label: string;
    model: string;
  };
  app_label: string;
  model: string;
}

interface MenuNode {
  id: string;
  type: "group" | "menu" | "child";
  title_key: string;
  title: string;
  href: string | null;
  has_children: boolean;
  status?: "new" | "existing" | "modified";
  current_permission?: CustomPermission | null;
  suggestions?: {
    codename: string;
    app_label: string | null;
    model: string | null;
    existing_permission?: Permission;
  };
  translations?: Record<string, string>;
  children?: MenuNode[];
}

interface AppModel {
  app_label: string;
  models: string[];
}

interface CustomPermission {
  id: number;
  name: string;
  codename: string;
  permission?: Permission | null;
  tn_parent_id: number | null;
  tn_level: number;
  tn_order: number;
}

interface PermissionMapping {
  menu_id: string;
  permission_id?: number;
  or_create?: {
    name: string;
    codename: string;
    app_label: string;
    model: string;
  };
}

// API functions
const fetchSyncPreview = async () => {
  const response = await apiGet<{
    error: boolean;
    message: {
      success: boolean;
      preview: MenuNode[];
      stats: {
        total: number;
        new: number;
        existing: number;
        modified: number;
        needs_permission: number;
      };
    };
  }>("permissions/sync/preview/");

  if (!response.success || response.data?.error) {
    throw new Error("Failed to fetch sync preview");
  }

  return response.data?.message;
};

const fetchAppsModels = async () => {
  const response = await apiGet<{
    error: boolean;
    message: {
      apps: AppModel[];
    };
  }>("permissions/apps-models/");

  if (!response.success || response.data?.error) {
    throw new Error("Failed to fetch apps and models");
  }

  return response.data?.message.apps;
};

const searchPermissions = async (query: string): Promise<Permission[]> => {
  const response = await apiPost<{
    error: boolean;
    message: {
      permissions: Permission[];
      total: number;
      query: string;
    };
  }>("permissions/search/", { query, limit: 10 });

  if (!response.success || response.data?.error) {
    throw new Error("Failed to search permissions");
  }

  return response.data?.message.permissions || [];
};

const createPermission = async (data: {
  name: string;
  codename: string;
  app_label: string;
  model: string;
}) => {
  const response = await apiPost<{
    error: boolean;
    message: {
      permission: Permission;
      message: string;
    };
  }>("permissions/create/", data);

  if (!response.success || response.data?.error) {
    throw new Error("Failed to create permission");
  }

  return response.data?.message.permission;
};

const executeSync = async (
  mappings: Record<string, PermissionMapping>,
  dryRun: boolean = false,
) => {
  const response = await apiPost<{
    error: boolean;
    message: {
      success: boolean;
      dry_run: boolean;
      results?: Record<string, unknown>;
      changes: {
        nodes_to_create: number;
        nodes_to_update: number;
        permissions_to_create: number;
        total_changes: number;
      };
      error?: string;
    };
  }>("permissions/sync/execute/", { mappings, dry_run: dryRun });

  if (!response.success || response.data?.error) {
    throw new Error("Failed to execute sync");
  }

  return response.data?.message;
};

type CustomPermissionNode = {
  id: string;
  name: string;
  codename: string | null;
  permission: Permission | null;
  tn_parent_id: string | null;
  tn_level: number;
  tn_order: number;
  codenamesCount?: number;
};

function CustomPermissionsCRUDPage() {
  const commonT = useTranslations("common");
  const t = useTranslations("administration.permissions");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();

  const drawerDirection = locale === "ar" ? "right" : "left";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [treeSelectedId, setTreeSelectedId] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<CustomPermissionNode | null>(
    null,
  );

  const [drawerName, setDrawerName] = useState("");
  const [drawerPermissionId, setDrawerPermissionId] = useState<number | null>(
    null,
  );

  const [permissionSearchQuery, setPermissionSearchQuery] = useState("");
  const [permissionSearchResults, setPermissionSearchResults] = useState<
    Permission[]
  >([]);
  const [permissionSearchLoading, setPermissionSearchLoading] = useState(false);
  const [showCreatePermissionDialog, setShowCreatePermissionDialog] =
    useState(false);
  const [newPermissionData, setNewPermissionData] = useState({
    name: "",
    codename: "",
    app_label: "",
    model: "",
  });

  const fetchCustomPermissions = async (): Promise<CustomPermissionNode[]> => {
    const response = await apiGet<{
      error: boolean;
      message: {
        data: CustomPermissionNode[];
        count: number;
        page: number;
        page_size: number;
        total_pages: number;
      };
    }>("permissions/custom-permissions/", {
      params: { page: 1, page_size: 100 },
    });

    if (!response.success || response.data?.error) {
      throw new Error("Failed to fetch custom permissions");
    }

    return response.data?.message?.data || [];
  };

  const createCustomPermission = async (payload: {
    name: string;
    tn_parent: string | null;
    permission_id: number | null;
  }) => {
    const res = await apiPost<{ error: boolean; message: string }>(
      "permissions/custom-permissions/create/",
      payload,
    );
    if (!res.success || res.data?.error) {
      throw new Error(res.data?.message || "Failed to create");
    }
    return res.data?.message;
  };

  const updateCustomPermission = async (payload: {
    id: string;
    name: string;
    permission_id: number | null;
  }) => {
    const res = await apiPut<{ error: boolean; message: string }>(
      `permissions/custom-permissions/${payload.id}/update/`,
      { name: payload.name, permission_id: payload.permission_id },
    );
    if (!res.success || res.data?.error) {
      throw new Error(res.data?.message || "Failed to update");
    }
    return res.data?.message;
  };

  const deleteCustomPermission = async (id: string) => {
    const res = await apiDelete<{ error: boolean; message: string }>(
      `permissions/custom-permissions/${id}/delete/`,
    );
    if (!res.success || res.data?.error) {
      throw new Error(res.data?.message || "Failed to delete");
    }
    return res.data?.message;
  };

  const { data: nodes = [], isLoading: isTreeLoading } = useQuery({
    queryKey: ["custom-permissions"],
    queryFn: fetchCustomPermissions,
  });

  const { data: appsModels = [], isLoading: isLoadingAppsModels } = useQuery({
    queryKey: ["apps-models"],
    queryFn: fetchAppsModels,
  });

  const selectedNodeFromId = useMemo(() => {
    if (!treeSelectedId) return null;
    return nodes.find((n) => n.id === treeSelectedId) || null;
  }, [treeSelectedId, nodes]);

  const treeInitialData: CustomPermissionNode[] = useMemo(() => {
    const childrenByParent = new Map<string | null, CustomPermissionNode[]>();
    const sorted = [...nodes].sort((a, b) => a.tn_order - b.tn_order);

    for (const n of sorted) {
      const key = n.tn_parent_id ?? null;
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key)!.push(n);
    }

    const nodeById = new Map<string, CustomPermissionNode>();
    sorted.forEach((n) => nodeById.set(n.id, n));

    const childrenIdsById = new Map<string, string[]>();
    for (const [parentId, childNodes] of childrenByParent.entries()) {
      if (!parentId) continue;
      childrenIdsById.set(
        parentId,
        childNodes.map((c) => c.id),
      );
    }

    const memo = new Map<string, number>();
    const countSubtree = (id: string): number => {
      const cached = memo.get(id);
      if (cached !== undefined) return cached;

      const node = nodeById.get(id);
      if (!node) return 0;
      const self = node.permission ? 1 : 0;
      const children = childrenIdsById.get(id) || [];
      const sumChildren = children.reduce(
        (acc, childId) => acc + countSubtree(childId),
        0,
      );
      const total = self + sumChildren;
      memo.set(id, total);
      return total;
    };

    const build = (parentId: string | null): CustomPermissionNode[] => {
      const kids = childrenByParent.get(parentId) || [];
      return kids.map((k) => {
        const built: CustomPermissionNode = {
          ...k,
          codenamesCount: countSubtree(k.id),
        };
        const children = childrenByParent.get(k.id) || [];
        if (children.length > 0) {
          (built as any).children = build(k.id);
        }
        return built;
      });
    };

    return build(null) as unknown as CustomPermissionNode[];
  }, [nodes]);

  const createMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      tn_parent: string | null;
      permission_id: number | null;
    }) => createCustomPermission(values),
    onSuccess: () => {
      toast.success("Created");
      queryClient.invalidateQueries({ queryKey: ["custom-permissions"] });
      setDrawerOpen(false);
      setTreeSelectedId(null);
    },
    onError: (err) => toast.error(err.message || "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: {
      id: string;
      name: string;
      permission_id: number | null;
    }) => updateCustomPermission(values),
    onSuccess: () => {
      toast.success("Updated");
      queryClient.invalidateQueries({ queryKey: ["custom-permissions"] });
      setDrawerOpen(false);
    },
    onError: (err) => toast.error(err.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteCustomPermission(id),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["custom-permissions"] });
      setDeleteDialogOpen(false);
      setNodeToDelete(null);
      setTreeSelectedId(null);
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  const createDjangoPermissionMutation = useMutation({
    mutationFn: createPermission,
    onSuccess: (permission) => {
      if (!permission) return;
      setDrawerPermissionId(permission.id);
      setShowCreatePermissionDialog(false);
      setPermissionSearchResults([permission]);
      setPermissionSearchQuery(permission.codename);
      toast.success("Permission created and selected");
      setNewPermissionData({
        name: "",
        codename: "",
        app_label: "",
        model: "",
      });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create permission");
    },
  });

  const openCreateDrawer = (parentId: string | null) => {
    setDrawerMode("create");
    setDrawerName("");
    setDrawerPermissionId(null);
    setPermissionSearchQuery("");
    setPermissionSearchResults([]);
    setPermissionSearchLoading(false);
    setShowCreatePermissionDialog(false);
    setNewPermissionData({
      name: "",
      codename: "",
      app_label: "",
      model: "",
    });
    setCreateParentId(parentId);
    setDrawerOpen(true);
  };

  const openEditDrawer = () => {
    if (!selectedNodeFromId) return;
    setDrawerMode("edit");
    setDrawerName(selectedNodeFromId.name);
    setDrawerPermissionId(selectedNodeFromId.permission?.id ?? null);
    setPermissionSearchQuery("");
    setPermissionSearchResults([]);
    setPermissionSearchLoading(false);
    setShowCreatePermissionDialog(false);
    setNewPermissionData({
      name: "",
      codename: "",
      app_label: "",
      model: "",
    });
    setDrawerOpen(true);
  };

  const handleSearchPermissions = useCallback(async () => {
    const query = permissionSearchQuery.trim();
    if (!query) {
      setPermissionSearchResults([]);
      return;
    }
    setPermissionSearchLoading(true);
    try {
      const results = await searchPermissions(query);
      setPermissionSearchResults(results);
    } catch {
      toast.error("Failed to search permissions");
      setPermissionSearchResults([]);
    } finally {
      setPermissionSearchLoading(false);
    }
  }, [permissionSearchQuery]);

  const openCreatePermissionDialog = () => {
    setNewPermissionData({
      name: drawerName || "",
      codename: permissionSearchQuery.trim().toLowerCase().replace(/\s+/g, "_"),
      app_label: "",
      model: "",
    });
    setShowCreatePermissionDialog(true);
  };

  const handleSubmitCreatePermission = () => {
    if (
      !newPermissionData.name ||
      !newPermissionData.codename ||
      !newPermissionData.app_label ||
      !newPermissionData.model
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    createDjangoPermissionMutation.mutate(newPermissionData);
  };

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      {isTreeLoading ? (
        <div className="py-10 text-center text-muted-foreground">
          Loading...
        </div>
      ) : (
        <ArboristTree
          initialData={treeInitialData as any}
          openByDefault
          height={520}
          selectedId={treeSelectedId}
          onSelectId={(id) => setTreeSelectedId(id)}
          toolbarActions={
            <>
            {hasPermission('add_custompermissions') && <Button
                type="button"
                size="icon"
                variant="default"
                aria-label="Add root node"
                title="Add root node"
                onClick={() => openCreateDrawer(null)}
              >
                <FolderPlus size={16} />
              </Button>}

              {hasPermission('add_custompermissions') && nodes.length > 0 && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Add child node"
                  title="Add child node"
                  onClick={() =>
                    openCreateDrawer(selectedNodeFromId?.id ?? null)
                  }
                  disabled={!selectedNodeFromId}
                >
                  <Plus size={16} />
                </Button>
              )}

              {hasPermission('change_custompermissions') && <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={commonT("edit")}
                title={commonT("edit")}
                onClick={openEditDrawer}
                disabled={!selectedNodeFromId}
              >
                <Pencil size={16} />
              </Button>}

               {hasPermission('delete_custompermissions') && <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label={commonT("delete")}
                title={commonT("delete")}
                onClick={() => {
                  if (!selectedNodeFromId) return;
                  setNodeToDelete(selectedNodeFromId);
                  setDeleteDialogOpen(true);
                }}
                disabled={!selectedNodeFromId}
              >
                <Trash2 size={16} />
              </Button>}
            </>
          }
          renderLabel={(nodeData) => {
            const node = nodeData as CustomPermissionNode;
            return (
              <div className="flex flex-col leading-tight">
                <span className="truncate">{node.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {node.codenamesCount ?? 0} code(s)
                </span>
              </div>
            );
          }}
        />
      )}

      <Drawer
        direction={drawerDirection}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      >
        <DrawerContent className="sm:max-w-sm overflow-y-auto">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="text-base font-semibold text-start">
              {drawerMode === "create"
                ? "Create Permission Node"
                : "Edit Permission Node"}
            </DrawerTitle>
          </DrawerHeader>

          <form
            className="p-5 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!drawerName.trim()) {
                toast.error("Name is required");
                return;
              }

              if (drawerMode === "create") {
                createMutation.mutate({
                  name: drawerName.trim(),
                  tn_parent: createParentId,
                  permission_id: drawerPermissionId,
                });
                return;
              }

              if (!selectedNodeFromId) return;
              updateMutation.mutate({
                id: selectedNodeFromId.id,
                name: drawerName.trim(),
                permission_id: drawerPermissionId,
              });
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">{commonT("name")}</label>
              <Input
                value={drawerName}
                onChange={(e) => setDrawerName(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Django Permission</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by codename or name..."
                  value={permissionSearchQuery}
                  onChange={(e) => setPermissionSearchQuery(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSearchPermissions()
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearchPermissions}
                  disabled={permissionSearchLoading}
                >
                  <Search
                    className={`h-4 w-4 ${permissionSearchLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>

              {permissionSearchResults.length > 0 && (
                <div className="h-36 border rounded-md overflow-auto">
                  <div className="p-2 space-y-1">
                    {permissionSearchResults.map((permission) => {
                      const active = drawerPermissionId === permission.id;
                      return (
                        <div
                          key={permission.id}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${
                            active
                              ? "bg-primary/10 border border-primary/20"
                              : ""
                          }`}
                          onClick={() => setDrawerPermissionId(permission.id)}
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {permission.codename}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {permission.app_label}.{permission.model}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!permissionSearchLoading &&
                permissionSearchQuery.trim() &&
                permissionSearchResults.length === 0 && (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    <div>No permission found for this search.</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={openCreatePermissionDialog}
                    >
                      Create this permission
                    </Button>
                  </div>
                )}

              {drawerPermissionId !== null && (
                <div className="text-sm text-muted-foreground">
                  Selected permission id: {drawerPermissionId}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => setDrawerPermissionId(null)}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <Button type="submit" disabled={busy} className="w-full">
                {commonT("save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setDrawerOpen(false)}
                className="w-full"
              >
                {commonT("cancel")}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete"
        description="Are you sure you want to delete this permission node?"
        status="danger"
        confirmText={commonT("confirm")}
        cancelText={commonT("cancel")}
        onConfirm={() => {
          if (!nodeToDelete) return;
          deleteMutation.mutate(nodeToDelete.id);
        }}
        isLoading={deleteMutation.isPending}
      />

      <Dialog
        open={showCreatePermissionDialog}
        onOpenChange={setShowCreatePermissionDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Django Permission</DialogTitle>
            <DialogDescription>
              Create a new permission and link it to this node.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cp-name">Permission Name *</Label>
              <Input
                id="cp-name"
                value={newPermissionData.name}
                onChange={(e) =>
                  setNewPermissionData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cp-codename">Codename *</Label>
              <Input
                id="cp-codename"
                value={newPermissionData.codename}
                onChange={(e) =>
                  setNewPermissionData((prev) => ({
                    ...prev,
                    codename: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cp-app">App Label *</Label>
                <Select
                  value={newPermissionData.app_label}
                  onValueChange={(value) =>
                    setNewPermissionData((prev) => ({
                      ...prev,
                      app_label: value,
                      model: "",
                    }))
                  }
                >
                  <SelectTrigger id="cp-app">
                    <SelectValue placeholder="Select app" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingAppsModels ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      appsModels.map((app) => (
                        <SelectItem key={app.app_label} value={app.app_label}>
                          {app.app_label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cp-model">Model *</Label>
                <Select
                  value={newPermissionData.model}
                  onValueChange={(value) =>
                    setNewPermissionData((prev) => ({ ...prev, model: value }))
                  }
                  disabled={!newPermissionData.app_label}
                >
                  <SelectTrigger id="cp-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {newPermissionData.app_label ? (
                      appsModels
                        .find(
                          (app) =>
                            app.app_label === newPermissionData.app_label,
                        )
                        ?.models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        )) || []
                    ) : (
                      <SelectItem value="select-app-first" disabled>
                        Select app first
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreatePermissionDialog(false)}
              disabled={createDjangoPermissionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCreatePermission}
              disabled={createDjangoPermissionMutation.isPending}
            >
              {createDjangoPermissionMutation.isPending
                ? "Creating..."
                : "Create Permission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SyncMenuPage() {
  const t = useTranslations("administration.permissions");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  // State
  const [selectedNode, setSelectedNode] = useState<MenuNode | null>(null);
  const [mappings, setMappings] = useState<Record<string, PermissionMapping>>(
    {},
  );
  const [hasHydratedFromPreview, setHasHydratedFromPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Permission[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPermissionData, setNewPermissionData] = useState({
    name: "",
    codename: "",
    app_label: "",
    model: "",
  });
  const [dryRun, setDryRun] = useState(false);

  // Queries
  const {
    data: previewData,
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ["menu-sync-preview"],
    queryFn: fetchSyncPreview,
  });

  const { data: appsModels = [], isLoading: isLoadingAppsModels } = useQuery({
    queryKey: ["apps-models"],
    queryFn: fetchAppsModels,
  });

  // Mutations
  const executeSyncMutation = useMutation({
    mutationFn: ({
      mappings,
      dryRun,
    }: {
      mappings: Record<string, PermissionMapping>;
      dryRun: boolean;
    }) => executeSync(mappings, dryRun),
    onSuccess: (data) => {
      if (!data) return;
      if (data.dry_run) {
        toast.success(
          `Dry run completed: ${data.changes?.total_changes || 0} changes would be made`,
        );
      } else {
        toast.success("Sync completed successfully");
        setHasHydratedFromPreview(false);
        queryClient.invalidateQueries({ queryKey: ["menu-sync-preview"] });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to execute sync");
    },
  });

  const createPermissionMutation = useMutation({
    mutationFn: createPermission,
    onSuccess: (permission) => {
      if (!permission) return;
      toast.success("Permission created successfully");
      setShowCreateDialog(false);

      // Update mapping for selected node
      if (selectedNode) {
        setMappings((prev) => ({
          ...prev,
          [selectedNode.id]: {
            menu_id: selectedNode.id,
            permission_id: permission.id,
          },
        }));
      }

      // Clear new permission data
      setNewPermissionData({
        name: "",
        codename: "",
        app_label: "",
        model: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create permission");
    },
  });

  // Effects
  useEffect(() => {
    if (!previewData?.preview || hasHydratedFromPreview) return;

    const deriveMappingsFromNodes = (
      nodes: MenuNode[],
    ): Record<string, PermissionMapping> => {
      const next: Record<string, PermissionMapping> = {};

      const visit = (node: MenuNode) => {
        const currentPermissionId = node.current_permission?.permission?.id;
        const suggestedExistingPermissionId =
          node.suggestions?.existing_permission?.id;

        if (currentPermissionId) {
          next[node.id] = {
            menu_id: node.id,
            permission_id: currentPermissionId,
          };
        } else if (suggestedExistingPermissionId) {
          next[node.id] = {
            menu_id: node.id,
            permission_id: suggestedExistingPermissionId,
          };
        } else {
          const codename = node.suggestions?.codename;
          const appLabel = node.suggestions?.app_label;
          const model = node.suggestions?.model;

          if (codename && appLabel && model) {
            const name = node.translations?.en || node.title;
            next[node.id] = {
              menu_id: node.id,
              or_create: {
                name,
                codename,
                app_label: appLabel,
                model,
              },
            };
          }
        }

        if (node.children?.length) {
          node.children.forEach(visit);
        }
      };

      nodes.forEach(visit);
      return next;
    };

    const derived = deriveMappingsFromNodes(previewData.preview);
    setMappings(Object.keys(derived).length ? derived : {});
    setHasHydratedFromPreview(true);
  }, [previewData, hasHydratedFromPreview]);

  useEffect(() => {
    if (selectedNode && selectedNode.suggestions?.codename) {
      handleSearch(selectedNode.suggestions.codename);
    }
  }, [selectedNode]);

  // Handlers
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchPermissions(query);
      setSearchResults(results);
    } catch (error) {
      toast.error("Failed to search permissions");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleNodeSelect = (node: MenuNode) => {
    setSelectedNode(node);

    // If node has href and needs permission, search for suggestions
    if (node.href && node.href !== "#" && node.suggestions?.codename) {
      setSearchQuery(node.suggestions.codename);
      handleSearch(node.suggestions.codename);
    }
  };

  const handleUseExistingPermission = (permission: Permission) => {
    if (!selectedNode) return;

    setMappings((prev) => ({
      ...prev,
      [selectedNode.id]: {
        menu_id: selectedNode.id,
        permission_id: permission.id,
      },
    }));

    toast.success(`Linked to permission: ${permission.codename}`);
  };

  const handleCreateNewPermission = () => {
    if (!selectedNode) return;

    const { suggestions } = selectedNode;
    const defaultName = selectedNode.translations?.en || selectedNode.title;

    setNewPermissionData({
      name: defaultName,
      codename: suggestions?.codename || "",
      app_label: suggestions?.app_label || "",
      model: suggestions?.model || "",
    });

    setShowCreateDialog(true);
  };

  const handleSubmitCreatePermission = () => {
    if (
      !newPermissionData.name ||
      !newPermissionData.codename ||
      !newPermissionData.app_label ||
      !newPermissionData.model
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    createPermissionMutation.mutate(newPermissionData);
  };

  const handleExecuteSync = () => {
    if (Object.keys(mappings).length === 0) {
      toast.error("No mappings configured");
      return;
    }

    executeSyncMutation.mutate({ mappings, dryRun });
  };

  const handleClearMapping = () => {
    if (!selectedNode) return;

    setMappings((prev) => {
      const newMappings = { ...prev };
      delete newMappings[selectedNode.id];
      return newMappings;
    });

    toast.success("Mapping cleared");
  };

  // Transform menu nodes for ArboristTree
  const treeData: ArboristNode[] =
    previewData?.preview?.map((node: MenuNode) => {
      const buildTreeNode = (menuNode: MenuNode): ArboristNode => {
        const treeNode: ArboristNode = {
          id: menuNode.id,
          name: menuNode.title,
          type: menuNode.type,
          href: menuNode.href,
          status: menuNode.status,
          hasPermission: !!mappings[menuNode.id],
        };

        // Recursively build children if they exist
        if (menuNode.children && menuNode.children.length > 0) {
          treeNode.children = menuNode.children.map((child: MenuNode) =>
            buildTreeNode(child),
          );
        }

        return treeNode;
      };

      return buildTreeNode(node);
    }) || [];

  // Render label for tree nodes
  const renderTreeLabel = (nodeData: ArboristNode) => {
    const node = nodeData as ArboristNode & {
      type: string;
      status?: string;
      hasPermission?: boolean;
    };

    return (
      <div className="flex items-center gap-2">
        {node.type === "group" && (
          <FolderTree className="h-3 w-3 text-muted-foreground" />
        )}
        {node.type === "menu" && (
          <Link className="h-3 w-3 text-muted-foreground" />
        )}
        {node.type === "child" && (
          <Key className="h-3 w-3 text-muted-foreground" />
        )}

        <span className="truncate">{node.name}</span>

        {node.status === "new" && (
          <Badge variant="outline" className="ml-2 text-xs">
            New
          </Badge>
        )}
        {node.status === "modified" && (
          <Badge
            variant="outline"
            className="ml-2 text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Modified
          </Badge>
        )}
        {node.hasPermission && (
          <Badge
            variant="outline"
            className="ml-2 text-xs bg-green-50 text-green-700 border-green-200"
          >
            Mapped
          </Badge>
        )}
      </div>
    );
  };

  // Stats
  const stats = previewData?.stats || {
    total: 0,
    new: 0,
    existing: 0,
    modified: 0,
    needs_permission: 0,
  };

  const mappedCount = Object.keys(mappings).length;

  return <CustomPermissionsCRUDPage />;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Menu Permissions Sync
          </h1>
          <p className="text-muted-foreground">
            Sync your menu structure with Django permissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetchPreview()}
            disabled={isLoadingPreview}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoadingPreview ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            onClick={handleExecuteSync}
            disabled={executeSyncMutation.isPending || mappedCount === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {dryRun ? "Dry Run" : "Execute Sync"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Menu Items</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            <p className="text-sm text-muted-foreground">New Items</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {stats.existing}
            </div>
            <p className="text-sm text-muted-foreground">Existing</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.modified}
            </div>
            <p className="text-sm text-muted-foreground">Modified</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {mappedCount} / {stats.needs_permission}
            </div>
            <p className="text-sm text-muted-foreground">
              Mapped / Needs Permission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Menu Tree */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Menu Structure</CardTitle>
            <CardDescription>
              Select a menu item to map it to a Django permission
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPreview ? (
              <div className="space-y-2">
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md" />
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md" />
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md" />
              </div>
            ) : (
              <ArboristTree
                initialData={treeData}
                height={600}
                openByDefault={true}
                selectedId={selectedNode?.id || null}
                onSelectId={(id) => {
                  if (!id) return;
                  // Find the node in the preview data
                  const findNode = (nodes: MenuNode[]): MenuNode | null => {
                    for (const node of nodes) {
                      if (node.id === id) return node;
                      if (node.children) {
                        const found = findNode(node.children);
                        if (found) return found;
                      }
                    }
                    return null;
                  };

                  const node = findNode(previewData?.preview || []);
                  if (node) handleNodeSelect(node);
                }}
                renderLabel={renderTreeLabel}
                showToolbar={true}
                toolbarActions={
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      New: {stats.new}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      Existing: {stats.existing}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 border-yellow-200"
                    >
                      Modified: {stats.modified}
                    </Badge>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Mapping Form */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Mapping</CardTitle>
            <CardDescription>
              {selectedNode
                ? `Map "${selectedNode.title}" to a permission`
                : "Select a menu item to map it"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div className="space-y-6">
                {/* Node Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Menu Item Info</h3>
                    <Badge
                      variant={
                        selectedNode.status === "new" ? "default" : "secondary"
                      }
                    >
                      {selectedNode.status?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 font-medium">
                        {selectedNode.type}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Href:</span>
                      <span className="ml-2 font-medium">
                        {selectedNode.href || "None"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        Translation Key:
                      </span>
                      <span className="ml-2 font-medium">
                        {selectedNode.title_key}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Current Mapping */}
                {mappings[selectedNode.id] && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Current Mapping</h3>
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Permission mapped</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearMapping}
                        >
                          <Unlink className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                      {mappings[selectedNode.id].permission_id && (
                        <p className="text-sm text-green-700 mt-1">
                          Using existing permission ID:{" "}
                          {mappings[selectedNode.id].permission_id}
                        </p>
                      )}
                      {mappings[selectedNode.id].or_create && (
                        <p className="text-sm text-green-700 mt-1">
                          Will create new permission:{" "}
                          {mappings[selectedNode.id].or_create?.codename}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {selectedNode.suggestions && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Suggestions</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Codename:
                          </span>
                          <span className="ml-2 font-medium">
                            {selectedNode.suggestions.codename || "None"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">App:</span>
                          <span className="ml-2 font-medium">
                            {selectedNode.suggestions.app_label || "None"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Model:</span>
                          <span className="ml-2 font-medium">
                            {selectedNode.suggestions.model || "None"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Existing Permissions */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Search Existing Permissions</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by codename or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSearch(searchQuery)
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleSearch(searchQuery)}
                      disabled={isSearching}
                    >
                      <Search
                        className={`h-4 w-4 ${isSearching ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>

                  {isSearching ? (
                    <div className="text-center py-4">
                      <div className="h-4 w-full bg-gray-200 animate-pulse rounded-md" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="h-40 border rounded-md overflow-auto">
                      <div className="p-2 space-y-1">
                        {searchResults.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                            onClick={() =>
                              handleUseExistingPermission(permission)
                            }
                          >
                            <div>
                              <div className="font-medium">
                                {permission.codename}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {permission.app_label}.{permission.model}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Link className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : searchQuery ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No permissions found for &quot;{searchQuery}&quot;
                    </div>
                  ) : null}
                </div>

                {/* Create New Permission */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Create New Permission</h3>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCreateNewPermission}
                    disabled={!selectedNode.href || selectedNode.href === "#"}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Create New Permission
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Only available for menu items with href (routes)
                  </p>
                </div>

                {/* Sync Options */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Sync Options</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="dry-run"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="dry-run">
                      Dry Run (preview changes without saving)
                    </Label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  Select a menu item from the tree to map it to a permission
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Permission Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Permission</DialogTitle>
            <DialogDescription>
              Create a new Django permission for &quot;{selectedNode?.title}
              &quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Permission Name *</Label>
              <Input
                id="name"
                value={newPermissionData.name}
                onChange={(e) =>
                  setNewPermissionData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g., View Label"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codename">Codename *</Label>
              <Input
                id="codename"
                value={newPermissionData.codename}
                onChange={(e) =>
                  setNewPermissionData((prev) => ({
                    ...prev,
                    codename: e.target.value,
                  }))
                }
                placeholder="e.g., view_label"
              />
              <p className="text-xs text-muted-foreground">
                Must be unique for this app and model
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="app_label">App Label *</Label>
                <Select
                  value={newPermissionData.app_label}
                  onValueChange={(value) =>
                    setNewPermissionData((prev) => ({
                      ...prev,
                      app_label: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select app" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingAppsModels ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      appsModels.map((app) => (
                        <SelectItem key={app.app_label} value={app.app_label}>
                          {app.app_label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Select
                  value={newPermissionData.model}
                  onValueChange={(value) =>
                    setNewPermissionData((prev) => ({ ...prev, model: value }))
                  }
                  disabled={!newPermissionData.app_label}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {newPermissionData.app_label ? (
                      appsModels
                        .find(
                          (app) =>
                            app.app_label === newPermissionData.app_label,
                        )
                        ?.models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        )) || []
                    ) : (
                      <SelectItem value="select-app-first" disabled>
                        Select app first
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={createPermissionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCreatePermission}
              disabled={createPermissionMutation.isPending}
            >
              {createPermissionMutation.isPending
                ? "Creating..."
                : "Create Permission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
