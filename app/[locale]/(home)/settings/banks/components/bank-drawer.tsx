"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  createBankAction,
  updateBankAction,
  type Bank,
} from "@/actions/personnel/settings/banks";

type BankDrawerMode = "create" | "edit";

interface BankDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BankDrawerMode;
  selectedBank: Bank | null;
  direction: "left" | "right";
}

export default function BankDrawer({
  open,
  onOpenChange,
  mode,
  selectedBank,
  direction,
}: BankDrawerProps) {
  const t = useTranslations("settings.banks");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const bankSchema = z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")),
  });

  type BankFormValues = z.infer<typeof bankSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({ name: "" });
      return;
    }

    if (!selectedBank) return;
    reset({ name: selectedBank.name });
  }, [open, mode, selectedBank, reset]);

  const createMutation = useMutation<void, Error, BankFormValues>({
    mutationFn: async (values) => {
      const res = await createBankAction(values.name);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["banks"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string } & BankFormValues
  >({
    mutationFn: async (payload) => {
      const res = await updateBankAction(payload.id, {
        name: payload.name,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["banks"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const busy = createMutation.isPending || updateMutation.isPending;
  const title = mode === "create" ? t("drawerTitleCreate") : t("drawerTitleEdit");

  const onSubmit = (values: BankFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }

    if (!selectedBank) return;
    updateMutation.mutate({ id: selectedBank.id, ...values });
  };

  return (
    <Drawer direction={direction} open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-sm overflow-y-auto">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="text-base font-semibold text-start">
            {title}
          </DrawerTitle>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-5 flex flex-col gap-5"
        >
          <Field>
            <FieldLabel htmlFor="bank-name">{commonT("name")}</FieldLabel>
            <FieldContent>
              <Input id="bank-name" className="w-full" {...register("name")} />
              <FieldError
                errors={errors.name ? [errors.name] : undefined}
              />
            </FieldContent>
          </Field>

          <div className="flex flex-col gap-2 mt-2">
            <Button type="submit" disabled={busy} className="w-full">
              {commonT("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              {commonT("cancel")}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

