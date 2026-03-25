"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "../../components/table";
import { LabelColumns } from "./components/columns";
import LabelFilters from "./components/filters";
import { ConfirmationDialog } from "../../components/confirmation-dialog";
import {
  deleteLabelAction,
  listLabelsAction,
  type Label,
} from "@/actions/personnel/settings/labels";
import { Plus } from "lucide-react";
import { useTablePagination } from "@/lib/table";
import toast from "react-hot-toast";
import LabelDrawer from "./components/label-drawer";
import { type LabelType } from "./components/label-types";

function LabelsPage() {
  const t = useTranslations("settings.labels");
  const commonT = useTranslations("common");
  const { page, pageSize, setPage, handlePageChange, handlePageSizeChange } =
    useTablePagination("labels");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<Label | null>(null);

  const drawerDirection = locale === "ar" ? "right" : "left";

  useEffect(() => {
    if (deleteDialogOpen) return;
    setLabelToDelete(null);
  }, [deleteDialogOpen]);

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await deleteLabelAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["labels"], exact: false });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setSelectedLabel(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (label: Label) => {
    setDrawerMode("edit");
    setSelectedLabel(label);
    setDrawerOpen(true);
  };

  const [nameQuery, setNameQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<LabelType | "">("");

  const { data: labelsData, isLoading } = useQuery({
    queryKey: ["labels", page, pageSize],
    queryFn: () => listLabelsAction(page, pageSize),
  });

  const data = labelsData?.data?.message?.data || [];
  const total = labelsData?.data?.message?.count || 0;

  const normalizedNameQuery = nameQuery.trim().toLowerCase();
  const hasClientFilters =
    Boolean(normalizedNameQuery) || (typeFilter !== "" && typeFilter !== undefined);

  const filteredData = hasClientFilters
    ? data.filter((label) => {
        const matchesType = typeFilter ? label.type === typeFilter : true;
        const matchesName = normalizedNameQuery
          ? label.name.toLowerCase().includes(normalizedNameQuery)
          : true;
        return matchesType && matchesName;
      })
    : data;

  const displayTotal = hasClientFilters ? filteredData.length : total;

  const handleFilterChange = (
    nextNameQuery: string,
    nextTypeFilter: LabelType | "",
  ) => {
    setNameQuery(nextNameQuery);
    setTypeFilter(nextTypeFilter);
    setPage(1);
  };

  const handleFilterReset = () => {
    setNameQuery("");
    setTypeFilter("");
    setPage(1);
  };

  const handleEdit = (label: unknown) => openEditDrawer(label as Label);

  const handleDelete = (label: unknown) => {
    setLabelToDelete(label as Label);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!labelToDelete) return;
    deleteMutation.mutate(labelToDelete.id);
    setLabelToDelete(null);
  };

  return (
    <>
      <DataTable
        columns={LabelColumns()}
        data={filteredData}
        total={displayTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        filters={
          <LabelFilters
            nameQuery={nameQuery}
            typeFilter={typeFilter}
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
            <Button onClick={openCreateDrawer}>
              <Plus />
              {t("addLabel")}
            </Button>
          </>
        }
      />

      <LabelDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedLabel={selectedLabel}
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

export default LabelsPage;
