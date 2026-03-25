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
  type ContractType,
  deleteContractTypeAction,
  listContractTypesAction,
} from "@/actions/personnel/settings/contractTypes";

import { ContractTypesColumns } from "./components/columns";
import ContractTypesFilters from "./components/filters";
import ContractTypeDrawer from "./components/contract-type-drawer";

export default function ContractTypesPage() {
  const t = useTranslations("settings.contractTypes");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const { page, pageSize, setPage, handlePageChange, handlePageSizeChange } =
    useTablePagination("contractTypes");

  const drawerDirection = locale === "ar" ? "right" : "left";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedContractType, setSelectedContractType] =
    useState<ContractType | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractTypeToDelete, setContractTypeToDelete] =
    useState<ContractType | null>(null);

  const [nameQuery, setNameQuery] = useState<string>("");

  const { data: contractTypesData, isLoading } = useQuery({
    queryKey: ["contractTypes", page, pageSize],
    queryFn: () => listContractTypesAction(page, pageSize),
  });

  const data = contractTypesData?.data?.message?.data || [];
  const total = contractTypesData?.data?.message?.count || 0;

  const normalizedNameQuery = nameQuery.trim().toLowerCase();
  const hasClientFilters = Boolean(normalizedNameQuery);

  const filteredData = useMemo(() => {
    if (!hasClientFilters) return data;
    return data.filter((contractType) =>
      contractType.name.toLowerCase().includes(normalizedNameQuery),
    );
  }, [data, hasClientFilters, normalizedNameQuery]);

  const displayTotal = hasClientFilters ? filteredData.length : total;

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setSelectedContractType(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (contractType: ContractType) => {
    setDrawerMode("edit");
    setSelectedContractType(contractType);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (deleteDialogOpen) return;
    setContractTypeToDelete(null);
  }, [deleteDialogOpen]);

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await deleteContractTypeAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["contractTypes"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const confirmDelete = () => {
    if (!contractTypeToDelete) return;
    deleteMutation.mutate(contractTypeToDelete.id);
    setContractTypeToDelete(null);
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
        columns={ContractTypesColumns()}
        data={filteredData}
        total={displayTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        filters={
          <ContractTypesFilters
            nameQuery={nameQuery}
            onSearchChange={handleFilterChange}
            onSearchReset={handleFilterReset}
          />
        }
        columnProps={{
          onEdit: (contractType: ContractType) =>
            openEditDrawer(contractType),
          onDelete: (contractType: ContractType) => {
            setContractTypeToDelete(contractType);
            setDeleteDialogOpen(true);
          },
        }}
        actions={
          <>
            <Button onClick={openCreateDrawer}>
              <Plus />
              {t("addContractType")}
            </Button>
          </>
        }
      />

      <ContractTypeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedContractType={selectedContractType}
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

