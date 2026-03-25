"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "../../../components/table";
import { GroupColumns } from "./components/columns";
import GroupFilters from "./components/filters";
import { ConfirmationDialog } from "../../../components/confirmation-dialog";
import {
  deleteGroupAction,
  listGroupsAction,
  type GroupType,
} from "@/actions/core/groups";
import { Plus, ArrowLeft } from "lucide-react";
import { useTablePagination } from "@/lib/table";
import toast from "react-hot-toast";
import GroupDrawer from "./components/group-drawer";
import { Link } from "@/lib/navigation";
import { useHasPermission } from "@/app/[locale]/(home)/components/use-has-permission";

function GroupsPage() {
  const t = useTranslations("administration.permissions.groups");
  const commonT = useTranslations("common");
  const { page, pageSize, setPage, handlePageChange, handlePageSizeChange } =
    useTablePagination("permissions-groups");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupType | null>(null);

  const drawerDirection = locale === "ar" ? "right" : "left";

  useEffect(() => {
    if (deleteDialogOpen) return;
    setGroupToDelete(null);
  }, [deleteDialogOpen]);

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await deleteGroupAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["groups"], exact: false });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setSelectedGroup(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (group: GroupType) => {
    setDrawerMode("edit");
    setSelectedGroup(group);
    setDrawerOpen(true);
  };

  const [nameQuery, setNameQuery] = useState<string>("");

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ["groups", page, pageSize],
    queryFn: () => listGroupsAction(page, pageSize),
  });

  const data = groupsData?.data?.message?.data || [];
  const total = groupsData?.data?.message?.count || 0;

  const normalizedNameQuery = nameQuery.trim().toLowerCase();
  const hasClientFilters = Boolean(normalizedNameQuery);

  const filteredData = hasClientFilters
    ? data.filter((group) => {
        const matchesName = normalizedNameQuery
          ? group.name.toLowerCase().includes(normalizedNameQuery)
          : true;
        return matchesName;
      })
    : data;

  const displayTotal = hasClientFilters ? filteredData.length : total;

  const handleFilterChange = (nextNameQuery: string) => {
    setNameQuery(nextNameQuery);
    setPage(1);
  };

  const handleFilterReset = () => {
    setNameQuery("");
    setPage(1);
  };

  const handleEdit = (group: unknown) => openEditDrawer(group as GroupType);

  const handleDelete = (group: unknown) => {
    setGroupToDelete(group as GroupType);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!groupToDelete) return;
    deleteMutation.mutate(groupToDelete.id);
    setGroupToDelete(null);
  };

  return (
    <>
      <DataTable
        columns={GroupColumns()}
        data={filteredData}
        total={displayTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        filters={
          <GroupFilters
            nameQuery={nameQuery}
            onSearchChange={handleFilterChange}
            onSearchReset={handleFilterReset}
          />
        }
        columnProps={{
          onEdit: handleEdit,
          onDelete: handleDelete,
        }}
        actions={
          <>
            {/*<Button variant="outline" asChild>
              <Link href="/administration/permissions">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {commonT("back")}
              </Link>
            </Button>*/}
            {hasPermission("add_group") && (
              <Button onClick={openCreateDrawer}>
                <Plus />
                {t("addGroup")}
              </Button>
            )}
          </>
        }
      />

      <GroupDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedGroup={selectedGroup}
        direction={drawerDirection}
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
    </>
  );
}

export default GroupsPage;
