"use client";

import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { BattalionTree } from "@/actions/personnel/settings/battalionTree";
import type { Label } from "@/actions/personnel/settings/labels";
import {
  createBattalionTreeAction,
  updateBattalionTreeAction,
} from "@/actions/personnel/settings/battalionTree";

type BattalionTreeDrawerMode = "create" | "edit";

type BattalionTreeDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BattalionTreeDrawerMode;
  selectedNode: BattalionTree | null;
  createParentId: string | null;
  createParentName: string | null;
  direction: "left" | "right";
  labels: Label[];
};

export default function BattalionTreeDrawer({
  open,
  onOpenChange,
  mode,
  selectedNode,
  createParentId,
  createParentName,
  direction,
  labels,
}: BattalionTreeDrawerProps) {
  const t = useTranslations("settings.battalionTree");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const schema = useMemo(() => {
    return z.object({
      name: z.string().trim().min(1, t("validation.nameRequired")),
      label: z.string().trim().min(1, t("validation.labelRequired")),
      tn_parent: z.string().nullable(),
    });
  }, [t]);

  type FormValues = z.infer<typeof schema>;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", label: "", tn_parent: null },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({ name: "", label: "", tn_parent: createParentId });
      return;
    }

    if (!selectedNode) return;

    const tnParent = selectedNode.tn_parent ?? null;
    reset({
      name: selectedNode.name,
      label: selectedNode.label,
      tn_parent: tnParent,
    });
  }, [open, mode, selectedNode, reset, createParentId]);

  const createMutation = useMutation<void, Error, FormValues>({
    mutationFn: async (values) => {
      const res = await createBattalionTreeAction({
        name: values.name,
        label: values.label,
        tn_parent: values.tn_parent,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["battalionTrees"] });
    },
    onError: (err) => toast.error(err.message || t("toasts.error")),
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string } & FormValues
  >({
    mutationFn: async (payload) => {
      const res = await updateBattalionTreeAction(payload.id, {
        name: payload.name,
        label: payload.label,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["battalionTrees"] });
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
            <FieldLabel htmlFor="battalion-tree-name">{commonT("name")}</FieldLabel>
            <FieldContent>
              <Input id="battalion-tree-name" className="w-full" {...register("name")} />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("label")}</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="label"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {labels.map((label) => (
                        <SelectItem key={label.id} value={label.id}>
                          {label.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={errors.label ? [errors.label] : undefined} />
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

