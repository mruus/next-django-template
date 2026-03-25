"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "../../components/table";
import { UserColumns } from "./components/columns";
import UserFilters from "./components/filters";
import { ConfirmationDialog } from "../../components/confirmation-dialog";
import {
  deleteUserAction,
  listUsersAction,
  type UserType,
} from "@/actions/core/users";
import { Plus } from "lucide-react";
import { useTablePagination } from "@/lib/table";
import toast from "react-hot-toast";
import UserDrawer from "./components/user-drawer";
import { useHasPermission } from "@/app/[locale]/(home)/components/use-has-permission";

function UsersPage() {
  const t = useTranslations("administration.users");
  const commonT = useTranslations("common");
  const { page, pageSize, setPage, handlePageChange, handlePageSizeChange } =
    useTablePagination("users");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);

  const drawerDirection = locale === "ar" ? "right" : "left";

  useEffect(() => {
    if (deleteDialogOpen) return;
    setUserToDelete(null);
  }, [deleteDialogOpen]);

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await deleteUserAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["users"], exact: false });
    },
    onError: (err) => toast.error(err.message || t("toasts.error")),
  });

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setSelectedUser(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (user: UserType) => {
    setDrawerMode("edit");
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const [searchQuery, setSearchQuery] = useState("");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", page, pageSize],
    queryFn: () => listUsersAction(page, pageSize),
  });

  const data = usersData?.data?.message?.data || [];
  const total = usersData?.data?.message?.count || 0;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const hasClientFilters = Boolean(normalizedSearch);
  const filteredData = hasClientFilters
    ? data.filter((user) => {
        const name = [user.first_name, user.last_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const email = (user.email || "").toLowerCase();
        const username = (user.username || "").toLowerCase();
        return (
          name.includes(normalizedSearch) ||
          email.includes(normalizedSearch) ||
          username.includes(normalizedSearch)
        );
      })
    : data;

  const displayTotal = hasClientFilters ? filteredData.length : total;

  const handleFilterChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleFilterReset = () => {
    setSearchQuery("");
    setPage(1);
  };

  const handleEdit = (user: unknown) => openEditDrawer(user as UserType);
  const handleDelete = (user: unknown) => {
    setUserToDelete(user as UserType);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    deleteMutation.mutate(userToDelete.id);
    setUserToDelete(null);
  };

  return (
    <>
      <DataTable
        columns={UserColumns()}
        data={filteredData}
        total={displayTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        filters={
          <UserFilters
            searchQuery={searchQuery}
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
            {hasPermission("add_user") && (
              <Button onClick={openCreateDrawer}>
                <Plus />
                {t("addUser")}
              </Button>
            )}
          </>
        }
      />

      <UserDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedUser={selectedUser}
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

export default UsersPage;
