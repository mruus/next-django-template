"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

import {
  createLabelAction,
  updateLabelAction,
  type Label,
} from "@/actions/personnel/settings/labels";
import { LABEL_TYPES, type LabelType } from "./label-types";

type LabelDrawerMode = "create" | "edit";

interface LabelDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LabelDrawerMode;
  selectedLabel: Label | null;
  direction: "left" | "right";
}

export default function LabelDrawer({
  open,
  onOpenChange,
  mode,
  selectedLabel,
  direction,
}: LabelDrawerProps) {
  const t = useTranslations("settings.labels");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const labelSchema = z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")),
    type: z.enum(LABEL_TYPES),
  });

  type LabelFormValues = z.infer<typeof labelSchema>;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LabelFormValues>({
    resolver: zodResolver(labelSchema),
    defaultValues: { name: "", type: "battalion" },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({ name: "", type: "battalion" });
      return;
    }

    if (!selectedLabel) return;
    reset({
      name: selectedLabel.name,
      type: selectedLabel.type as LabelType,
    });
  }, [open, mode, selectedLabel, reset]);

  const createMutation = useMutation<void, Error, LabelFormValues>({
    mutationFn: async (values) => {
      const res = await createLabelAction(values.name, values.type as LabelType);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string } & LabelFormValues
  >({
    mutationFn: async (payload) => {
      const res = await updateLabelAction(payload.id, {
        name: payload.name,
        type: payload.type as LabelType,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const onSubmit = (values: LabelFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }

    if (!selectedLabel) return;
    updateMutation.mutate({ id: selectedLabel.id, ...values });
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
            <FieldLabel htmlFor="label-name">{commonT("name")}</FieldLabel>
            <FieldContent>
              <Input id="label-name" className="w-full" {...register("name")} />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="label-type">{commonT("type")}</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LABEL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={errors.type ? [errors.type] : undefined} />
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

