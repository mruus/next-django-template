"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "../../components/table";
import { QualificationColumns } from "./components/columns";
import QualificationFilters from "./components/filters";
import { ConfirmationDialog } from "../../components/confirmation-dialog";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import { useTablePagination } from "@/lib/table";
import QualificationDrawer from "./components/qualification-drawer";
import { type Qualification } from "@/actions/personnel/settings/qualifications";
import {
  deleteQualificationAction,
  listQualificationsAction,
} from "@/actions/personnel/settings/qualifications";
import { type QualificationType } from "./components/qualification-types";

function QualificationsPage() {
  const t = useTranslations("settings.qualifications");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const { page, pageSize, setPage, handlePageChange, handlePageSizeChange } =
    useTablePagination("qualifications");

  const drawerDirection = locale === "ar" ? "right" : "left";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedQualification, setSelectedQualification] =
    useState<Qualification | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [qualificationToDelete, setQualificationToDelete] =
    useState<Qualification | null>(null);

  const [nameQuery, setNameQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<QualificationType | "">("");

  const { data: qualificationsData, isLoading } = useQuery({
    queryKey: ["qualifications", page, pageSize],
    queryFn: () => listQualificationsAction(page, pageSize),
  });

  const data = qualificationsData?.data?.message?.data || [];
  const total = qualificationsData?.data?.message?.count || 0;

  const normalizedNameQuery = nameQuery.trim().toLowerCase();
  const hasClientFilters =
    Boolean(normalizedNameQuery) || (typeFilter !== "" && typeFilter !== undefined);

  const filteredData = hasClientFilters
    ? data.filter((qualification: Qualification) => {
        const matchesType = typeFilter ? qualification.type === typeFilter : true;
        const matchesName = normalizedNameQuery
          ? qualification.name.toLowerCase().includes(normalizedNameQuery)
          : true;
        return matchesType && matchesName;
      })
    : data;

  const displayTotal = hasClientFilters ? filteredData.length : total;

  const handleFilterChange = (
    nextNameQuery: string,
    nextTypeFilter: QualificationType | "",
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

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setSelectedQualification(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (qualification: Qualification) => {
    setDrawerMode("edit");
    setSelectedQualification(qualification);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (deleteDialogOpen) return;
    setQualificationToDelete(null);
  }, [deleteDialogOpen]);

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await deleteQualificationAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["qualifications"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const handleEdit = (qualification: unknown) =>
    openEditDrawer(qualification as Qualification);

  const handleDelete = (qualification: unknown) => {
    setQualificationToDelete(qualification as Qualification);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!qualificationToDelete) return;
    deleteMutation.mutate(qualificationToDelete.id);
    setQualificationToDelete(null);
  };

  return (
    <>
      <DataTable
        columns={QualificationColumns()}
        data={filteredData}
        total={displayTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        filters={
          <QualificationFilters
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
              {t("addQualification")}
            </Button>
          </>
        }
      />

      <QualificationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedQualification={selectedQualification}
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

export default QualificationsPage;

