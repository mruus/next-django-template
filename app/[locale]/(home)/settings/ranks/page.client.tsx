"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import { DataTable } from "../../components/table";
import { Button } from "@/components/ui/button";
import { useTablePagination } from "@/lib/table";

import { type Rank, deleteRankAction, listRanksAction } from "@/actions/personnel/settings/ranks";
import { RanksColumns } from "./components/columns";
import RanksFilters from "./components/filters";
import RankDrawer from "./components/rank-drawer";
import { ConfirmationDialog } from "../../components/confirmation-dialog";

export default function RanksPage() {
  const t = useTranslations("settings.ranks");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const { page, pageSize, setPage, handlePageChange, handlePageSizeChange } =
    useTablePagination("ranks");

  const drawerDirection = locale === "ar" ? "right" : "left";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rankToDelete, setRankToDelete] = useState<Rank | null>(null);

  const [nameQuery, setNameQuery] = useState<string>("");

  const { data: ranksData, isLoading } = useQuery({
    queryKey: ["ranks", page, pageSize],
    queryFn: () => listRanksAction(page, pageSize),
  });

  const data = ranksData?.data?.message?.data || [];
  const total = ranksData?.data?.message?.count || 0;

  const normalizedNameQuery = nameQuery.trim().toLowerCase();
  const hasClientFilters = Boolean(normalizedNameQuery);

  const filteredData = useMemo(() => {
    if (!hasClientFilters) return data;
    return data.filter((rank) =>
      rank.name.toLowerCase().includes(normalizedNameQuery),
    );
  }, [data, hasClientFilters, normalizedNameQuery]);

  const displayTotal = hasClientFilters ? filteredData.length : total;

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setSelectedRank(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (rank: Rank) => {
    setDrawerMode("edit");
    setSelectedRank(rank);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (deleteDialogOpen) return;
    setRankToDelete(null);
  }, [deleteDialogOpen]);

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await deleteRankAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["ranks"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const confirmDelete = () => {
    if (!rankToDelete) return;
    deleteMutation.mutate(rankToDelete.id);
    setRankToDelete(null);
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
        columns={RanksColumns()}
        data={filteredData}
        total={displayTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        filters={
          <RanksFilters
            nameQuery={nameQuery}
            onSearchChange={handleFilterChange}
            onSearchReset={handleFilterReset}
          />
        }
        columnProps={{
          onEdit: (rank: Rank) => openEditDrawer(rank),
          onDelete: (rank: Rank) => {
            setRankToDelete(rank);
            setDeleteDialogOpen(true);
          },
        }}
        actions={
          <>
            <Button onClick={openCreateDrawer}>
              <Plus />
              {t("addRank")}
            </Button>
          </>
        }
      />

      <RankDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedRank={selectedRank}
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

