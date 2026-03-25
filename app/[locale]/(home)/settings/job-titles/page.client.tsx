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
  deleteJobTitleAction,
  listJobTitlesAction,
  type JobTitle,
} from "@/actions/personnel/settings/jobTitles";
import { JobTitlesColumns } from "./components/columns";
import JobTitlesFilters from "./components/filters";
import JobTitleDrawer from "./components/job-title-drawer";

export default function JobTitlesPage() {
  const t = useTranslations("settings.jobTitles");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const { page, pageSize, setPage, handlePageChange, handlePageSizeChange } =
    useTablePagination("jobTitles");

  const drawerDirection = locale === "ar" ? "right" : "left";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedJobTitle, setSelectedJobTitle] =
    useState<JobTitle | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobTitleToDelete, setJobTitleToDelete] =
    useState<JobTitle | null>(null);

  const [nameQuery, setNameQuery] = useState<string>("");

  const { data: jobTitlesData, isLoading } = useQuery({
    queryKey: ["jobTitles", page, pageSize],
    queryFn: () => listJobTitlesAction(page, pageSize),
  });

  const data = jobTitlesData?.data?.message?.data || [];
  const total = jobTitlesData?.data?.message?.count || 0;

  const normalizedNameQuery = nameQuery.trim().toLowerCase();
  const hasClientFilters = Boolean(normalizedNameQuery);

  const filteredData = useMemo(() => {
    if (!hasClientFilters) return data;
    return data.filter((jobTitle) =>
      jobTitle.name.toLowerCase().includes(normalizedNameQuery),
    );
  }, [data, hasClientFilters, normalizedNameQuery]);

  const displayTotal = hasClientFilters ? filteredData.length : total;

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setSelectedJobTitle(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (jobTitle: JobTitle) => {
    setDrawerMode("edit");
    setSelectedJobTitle(jobTitle);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (deleteDialogOpen) return;
    setJobTitleToDelete(null);
  }, [deleteDialogOpen]);

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await deleteJobTitleAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["jobTitles"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const confirmDelete = () => {
    if (!jobTitleToDelete) return;
    deleteMutation.mutate(jobTitleToDelete.id);
    setJobTitleToDelete(null);
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
        columns={JobTitlesColumns()}
        data={filteredData}
        total={displayTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        filters={
          <JobTitlesFilters
            nameQuery={nameQuery}
            onSearchChange={handleFilterChange}
            onSearchReset={handleFilterReset}
          />
        }
        columnProps={{
          onEdit: (jobTitle: JobTitle) => openEditDrawer(jobTitle),
          onDelete: (jobTitle: JobTitle) => {
            setJobTitleToDelete(jobTitle);
            setDeleteDialogOpen(true);
          },
        }}
        actions={
          <>
            <Button onClick={openCreateDrawer}>
              <Plus />
              {t("addJobTitle")}
            </Button>
          </>
        }
      />

      <JobTitleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedJobTitle={selectedJobTitle}
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

