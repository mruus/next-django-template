"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import { DataTable } from "../../components/table";
import { Button } from "@/components/ui/button";
import { useTablePagination } from "@/lib/table";
import { ConfirmationDialog } from "../../components/confirmation-dialog";

import {
  deleteAllowanceAction,
  listAllowancesAction,
  type Allowance,
} from "@/actions/personnel/settings/allowances";
import { AllowancesColumns } from "./components/columns";
import AllowancesFilters from "./components/filters";
import AllowanceDrawer from "./components/allowance-drawer";

export default function AllowancesPage() {
  const t = useTranslations("settings.allowances");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const { page, pageSize, setPage, handlePageChange, handlePageSizeChange } =
    useTablePagination("allowances");

  const drawerDirection = locale === "ar" ? "right" : "left";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedAllowance, setSelectedAllowance] =
    useState<Allowance | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [allowanceToDelete, setAllowanceToDelete] =
    useState<Allowance | null>(null);

  const [nameQuery, setNameQuery] = useState<string>("");

  const { data: allowancesData, isLoading } = useQuery({
    queryKey: ["allowances", page, pageSize],
    queryFn: () => listAllowancesAction(page, pageSize),
  });

  const data = allowancesData?.data?.message?.data || [];
  const total = allowancesData?.data?.message?.count || 0;

  const normalizedNameQuery = nameQuery.trim().toLowerCase();
  const hasClientFilters = Boolean(normalizedNameQuery);

  const filteredData = useMemo(() => {
    if (!hasClientFilters) return data;
    return data.filter((allowance) =>
      allowance.name.toLowerCase().includes(normalizedNameQuery),
    );
  }, [data, hasClientFilters, normalizedNameQuery]);

  const displayTotal = hasClientFilters ? filteredData.length : total;

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setSelectedAllowance(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (allowance: Allowance) => {
    setDrawerMode("edit");
    setSelectedAllowance(allowance);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (deleteDialogOpen) return;
    setAllowanceToDelete(null);
  }, [deleteDialogOpen]);

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await deleteAllowanceAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["allowances"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const confirmDelete = () => {
    if (!allowanceToDelete) return;
    deleteMutation.mutate(allowanceToDelete.id);
    setAllowanceToDelete(null);
  };

  const handleFilterChange = (nextNameQuery: string) => {
    setNameQuery(nextNameQuery);
    setPage(1);
  };

  const handleFilterReset = () => {
    setNameQuery("");
    setPage(1);
  };

  return (
    <>
      <DataTable
        columns={AllowancesColumns()}
        data={filteredData}
        total={displayTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        filters={
          <AllowancesFilters
            nameQuery={nameQuery}
            onSearchChange={handleFilterChange}
            onSearchReset={handleFilterReset}
          />
        }
        columnProps={{
          onEdit: (allowance: Allowance) => openEditDrawer(allowance),
          onDelete: (allowance: Allowance) => {
            setAllowanceToDelete(allowance);
            setDeleteDialogOpen(true);
          },
        }}
        actions={
          <>
            <Button onClick={openCreateDrawer}>
              <Plus />
              {t("addAllowance")}
            </Button>
          </>
        }
      />

      <AllowanceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedAllowance={selectedAllowance}
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

