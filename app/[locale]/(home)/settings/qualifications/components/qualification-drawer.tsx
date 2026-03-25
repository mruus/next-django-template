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
  createQualificationAction,
  updateQualificationAction,
  type Qualification,
} from "@/actions/personnel/settings/qualifications";
import { QUALIFICATION_TYPES, type QualificationType } from "./qualification-types";

type QualificationDrawerMode = "create" | "edit";

interface QualificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: QualificationDrawerMode;
  selectedQualification: Qualification | null;
  direction: "left" | "right";
}

export default function QualificationDrawer({
  open,
  onOpenChange,
  mode,
  selectedQualification,
  direction,
}: QualificationDrawerProps) {
  const t = useTranslations("settings.qualifications");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const qualificationSchema = z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")),
    type: z.enum(QUALIFICATION_TYPES),
  });

  type QualificationFormValues = z.infer<typeof qualificationSchema>;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QualificationFormValues>({
    resolver: zodResolver(qualificationSchema),
    defaultValues: { name: "", type: "education" },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({ name: "", type: "education" });
      return;
    }

    if (!selectedQualification) return;
    reset({
      name: selectedQualification.name,
      type: selectedQualification.type as QualificationType,
    });
  }, [open, mode, selectedQualification, reset]);

  const createMutation = useMutation<void, Error, QualificationFormValues>({
    mutationFn: async (values) => {
      const res = await createQualificationAction(
        values.name,
        values.type as QualificationType,
      );
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["qualifications"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string } & QualificationFormValues
  >({
    mutationFn: async (payload) => {
      const res = await updateQualificationAction(payload.id, {
        name: payload.name,
        type: payload.type as QualificationType,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["qualifications"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const title =
    mode === "create" ? t("drawerTitleCreate") : t("drawerTitleEdit");

  const busy = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: QualificationFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }

    if (!selectedQualification) return;
    updateMutation.mutate({ id: selectedQualification.id, ...values });
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
            <FieldLabel htmlFor="qualification-name">{commonT("name")}</FieldLabel>
            <FieldContent>
              <Input
                id="qualification-name"
                className="w-full"
                {...register("name")}
              />
              <FieldError
                errors={errors.name ? [errors.name] : undefined}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="qualification-type">{commonT("type")}</FieldLabel>
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
                      {QUALIFICATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError
                errors={errors.type ? [errors.type] : undefined}
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

