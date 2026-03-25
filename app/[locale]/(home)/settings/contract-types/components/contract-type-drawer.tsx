"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createContractTypeAction,
  updateContractTypeAction,
  type ContractType,
} from "@/actions/personnel/settings/contractTypes";

type ContractTypeDrawerMode = "create" | "edit";

interface ContractTypeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ContractTypeDrawerMode;
  selectedContractType: ContractType | null;
  direction: "left" | "right";
}

export default function ContractTypeDrawer({
  open,
  onOpenChange,
  mode,
  selectedContractType,
  direction,
}: ContractTypeDrawerProps) {
  const t = useTranslations("settings.contractTypes");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const contractTypeSchema = z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")),
    description: z.string().trim().optional().default(""),
  });

  type ContractTypeFormValues = z.infer<typeof contractTypeSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContractTypeFormValues>({
    resolver: zodResolver(contractTypeSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({ name: "", description: "" });
      return;
    }

    if (!selectedContractType) return;

    reset({
      name: selectedContractType.name,
      description: selectedContractType.description || "",
    });
  }, [open, mode, selectedContractType, reset]);

  const createMutation = useMutation<void, Error, ContractTypeFormValues>({
    mutationFn: async (values) => {
      const res = await createContractTypeAction(
        values.name,
        values.description || "",
      );
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["contractTypes"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string } & ContractTypeFormValues
  >({
    mutationFn: async (payload) => {
      const res = await updateContractTypeAction(payload.id, {
        name: payload.name,
        description: payload.description || "",
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["contractTypes"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const onSubmit = (values: ContractTypeFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }

    if (!selectedContractType) return;

    updateMutation.mutate({ id: selectedContractType.id, ...values });
  };

  const busy = createMutation.isPending || updateMutation.isPending;
  const title =
    mode === "create" ? t("drawerTitleCreate") : t("drawerTitleEdit");

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
            <FieldLabel htmlFor="contract-type-name">{commonT("name")}</FieldLabel>
            <FieldContent>
              <Input
                id="contract-type-name"
                className="w-full"
                {...register("name")}
              />
              <FieldError
                errors={errors.name ? [errors.name] : undefined}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="contract-type-description">{t("description")}</FieldLabel>
            <FieldContent>
              <Textarea
                id="contract-type-description"
                className="w-full min-h-24"
                {...register("description")}
              />
              <FieldError
                errors={errors.description ? [errors.description] : undefined}
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

