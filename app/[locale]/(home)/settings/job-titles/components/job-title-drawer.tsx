"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createJobTitleAction,
  updateJobTitleAction,
  type JobTitle,
} from "@/actions/personnel/settings/jobTitles";

type JobTitleDrawerMode = "create" | "edit";

interface JobTitleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: JobTitleDrawerMode;
  selectedJobTitle: JobTitle | null;
  direction: "left" | "right";
}

export default function JobTitleDrawer({
  open,
  onOpenChange,
  mode,
  selectedJobTitle,
  direction,
}: JobTitleDrawerProps) {
  const t = useTranslations("settings.jobTitles");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const schema = z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")),
    description: z.string().optional().default(""),
  });

  type JobTitleFormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobTitleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({ name: "", description: "" });
      return;
    }

    if (!selectedJobTitle) return;

    reset({
      name: selectedJobTitle.name,
      description: selectedJobTitle.description || "",
    });
  }, [open, mode, selectedJobTitle, reset]);

  const createMutation = useMutation<void, Error, JobTitleFormValues>({
    mutationFn: async (values) => {
      const res = await createJobTitleAction({
        name: values.name,
        description: values.description || "",
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["jobTitles"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string } & JobTitleFormValues
  >({
    mutationFn: async (payload) => {
      const res = await updateJobTitleAction(payload.id, {
        name: payload.name,
        description: payload.description || "",
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["jobTitles"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const onSubmit = (values: JobTitleFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }

    if (!selectedJobTitle) return;
    updateMutation.mutate({ id: selectedJobTitle.id, ...values });
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
            <FieldLabel htmlFor="job-title-name">{commonT("name")}</FieldLabel>
            <FieldContent>
              <Input
                id="job-title-name"
                className="w-full"
                {...register("name")}
              />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="job-title-description">{t("description")}</FieldLabel>
            <FieldContent>
              <Textarea
                id="job-title-description"
                className="w-full min-h-24"
                {...register("description")}
              />
              <FieldError
                errors={
                  errors.description ? [errors.description] : undefined
                }
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

