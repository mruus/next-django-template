"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import { DataTable } from "../../components/table";
import { Button } from "@/components/ui/button";
import { useTablePagination } from "@/lib/table";

import { type Bank, deleteBankAction, listBanksAction } from "@/actions/personnel/settings/banks";
import { BankColumns } from "./components/columns";
import BankFilters from "./components/filters";
import BankDrawer from "./components/bank-drawer";
import { ConfirmationDialog } from "../../components/confirmation-dialog";

export default function BanksPage() {
  const t = useTranslations("settings.banks");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const { page, pageSize, setPage, handlePageChange, handlePageSizeChange } =
    useTablePagination("banks");

  const drawerDirection = locale === "ar" ? "right" : "left";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<Bank | null>(null);

  const [nameQuery, setNameQuery] = useState<string>("");

  const { data: banksData, isLoading } = useQuery({
    queryKey: ["banks", page, pageSize],
    queryFn: () => listBanksAction(page, pageSize),
  });

  const data = banksData?.data?.message?.data || [];
  const total = banksData?.data?.message?.count || 0;

  const normalizedNameQuery = nameQuery.trim().toLowerCase();
  const hasClientFilters = Boolean(normalizedNameQuery);

  const filteredData = useMemo(() => {
    if (!hasClientFilters) return data;
    return data.filter((bank) =>
      bank.name.toLowerCase().includes(normalizedNameQuery),
    );
  }, [data, hasClientFilters, normalizedNameQuery]);

  const displayTotal = hasClientFilters ? filteredData.length : total;

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setSelectedBank(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (bank: Bank) => {
    setDrawerMode("edit");
    setSelectedBank(bank);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (deleteDialogOpen) return;
    setBankToDelete(null);
  }, [deleteDialogOpen]);

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await deleteBankAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["banks"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const confirmDelete = () => {
    if (!bankToDelete) return;
    deleteMutation.mutate(bankToDelete.id);
    setBankToDelete(null);
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
        columns={BankColumns()}
        data={filteredData}
        total={displayTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        filters={
          <BankFilters
            nameQuery={nameQuery}
            onSearchChange={handleFilterChange}
            onSearchReset={handleFilterReset}
          />
        }
        columnProps={{
          onEdit: (bank: Bank) => openEditDrawer(bank),
          onDelete: (bank: Bank) => {
            setBankToDelete(bank);
            setDeleteDialogOpen(true);
          },
        }}
        actions={
          <>
            <Button onClick={openCreateDrawer}>
              <Plus />
              {t("addBank")}
            </Button>
          </>
        }
      />

      <BankDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedBank={selectedBank}
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

