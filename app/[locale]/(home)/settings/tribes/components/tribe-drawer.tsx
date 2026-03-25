"use client";

import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import type { Tribe } from "@/actions/personnel/settings/tribes";
import { createTribeAction, updateTribeAction } from "@/actions/personnel/settings/tribes";

type TribeDrawerMode = "create" | "edit";

type TribeDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: TribeDrawerMode;
  selectedNode: Tribe | null;
  createParentId: string | null;
  createParentName: string | null;
  direction: "left" | "right";
};

export default function TribeDrawer({
  open,
  onOpenChange,
  mode,
  selectedNode,
  createParentId,
  createParentName,
  direction,
}: TribeDrawerProps) {
  const t = useTranslations("settings.tribes");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const schema = useMemo(() => {
    return z.object({
      name: z.string().trim().min(1, t("validation.nameRequired")),
      tn_parent: z.string().nullable(),
    });
  }, [t]);

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", tn_parent: null },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({ name: "", tn_parent: createParentId });
      return;
    }

    if (!selectedNode) return;
    reset({
      name: selectedNode.name,
      tn_parent: selectedNode.tn_parent ?? null,
    });
  }, [open, mode, selectedNode, reset, createParentId]);

  const createMutation = useMutation<void, Error, FormValues>({
    mutationFn: async (values) => {
      const res = await createTribeAction({
        name: values.name,
        tn_parent: values.tn_parent,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["tribes"] });
    },
    onError: (err) => toast.error(err.message || t("toasts.error")),
  });

  const updateMutation = useMutation<void, Error, { id: string } & FormValues>({
    mutationFn: async (payload) => {
      const res = await updateTribeAction(payload.id, { name: payload.name });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["tribes"] });
    },
    onError: (err) => toast.error(err.message || t("toasts.error")),
  });

  const onSubmit = (values: FormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }
    if (!selectedNode) return;
    updateMutation.mutate({ id: selectedNode.id, ...values });
  };

  const busy = createMutation.isPending || updateMutation.isPending;
  const title = useMemo(() => {
    if (mode === "edit") return t("drawerTitleEdit");
    if (createParentName) return `${t("drawerTitleCreate")} — ${createParentName}`;
    return t("drawerTitleCreate");
  }, [mode, t, createParentName]);

  return (
    <Drawer direction={direction} open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-sm overflow-y-auto">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="text-base font-semibold text-start">
            {title}
          </DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 flex flex-col gap-5">
          <Field>
            <FieldLabel htmlFor="tribe-name">{commonT("name")}</FieldLabel>
            <FieldContent>
              <Input id="tribe-name" className="w-full" {...register("name")} />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
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

