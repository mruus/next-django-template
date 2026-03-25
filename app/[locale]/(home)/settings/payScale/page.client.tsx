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
  deletePayScaleAction,
  listPayScalesAction,
  type PayScale,
} from "@/actions/personnel/settings/payScale";
import { PayScaleColumns } from "./components/columns";
import PayScaleDrawer from "./components/pay-scale-drawer";

export default function PayScalePage() {
  const t = useTranslations("settings.payScale");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const { page, pageSize, setPage, handlePageChange, handlePageSizeChange } =
    useTablePagination("payScale");

  const drawerDirection = locale === "ar" ? "right" : "left";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedPayScale, setSelectedPayScale] =
    useState<PayScale | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [payScaleToDelete, setPayScaleToDelete] =
    useState<PayScale | null>(null);

  const { data: payScalesData, isLoading } = useQuery({
    queryKey: ["payScales", page, pageSize],
    queryFn: () => listPayScalesAction(page, pageSize),
  });

  const data = payScalesData?.data?.message?.data || [];
  const total = payScalesData?.data?.message?.count || 0;

  const filteredData = useMemo(() => data, [data]);

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setSelectedPayScale(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (payScale: PayScale) => {
    setDrawerMode("edit");
    setSelectedPayScale(payScale);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (deleteDialogOpen) return;
    setPayScaleToDelete(null);
  }, [deleteDialogOpen]);

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await deletePayScaleAction(id);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["payScales"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const confirmDelete = () => {
    if (!payScaleToDelete) return;
    deleteMutation.mutate(payScaleToDelete.id);
    setPayScaleToDelete(null);
  };

  const handleEdit = (payScale: unknown) =>
    openEditDrawer(payScale as PayScale);

  const handleDelete = (payScale: unknown) => {
    setPayScaleToDelete(payScale as PayScale);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <DataTable
        columns={PayScaleColumns()}
        data={filteredData}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        columnProps={{
          onEdit: handleEdit,
          onDelete: handleDelete,
        }}
        actions={
          <>
            <Button onClick={openCreateDrawer}>
              <Plus />
              {t("addPayScale")}
            </Button>
          </>
        }
      />

      <PayScaleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        selectedPayScale={selectedPayScale}
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

