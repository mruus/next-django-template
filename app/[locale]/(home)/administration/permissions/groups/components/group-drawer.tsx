"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  createGroupAction,
  partialUpdateGroupAction,
  type GroupType,
} from "@/actions/core/groups";

type GroupDrawerMode = "create" | "edit";

interface GroupDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: GroupDrawerMode;
  selectedGroup: GroupType | null;
  direction: "left" | "right";
}

export default function GroupDrawer({
  open,
  onOpenChange,
  mode,
  selectedGroup,
  direction,
}: GroupDrawerProps) {
  const t = useTranslations("administration.permissions.groups");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const groupSchema = z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")),
  });

  type GroupFormValues = z.infer<typeof groupSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({
        name: "",
      });
      return;
    }

    if (!selectedGroup) return;

    reset({
      name: selectedGroup.name,
    });
  }, [open, mode, selectedGroup, reset]);

  const createMutation = useMutation<void, Error, GroupFormValues>({
    mutationFn: async (values) => {
      const res = await createGroupAction({
        name: values.name,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: number } & GroupFormValues
  >({
    mutationFn: async (payload) => {
      const res = await partialUpdateGroupAction(payload.id, {
        name: payload.name,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const onSubmit = (values: GroupFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }
    if (!selectedGroup) return;
    updateMutation.mutate({ id: selectedGroup.id, ...values });
  };

  const busy = createMutation.isPending || updateMutation.isPending;
  const title =
    mode === "create" ? t("drawerTitleCreate") : t("drawerTitleEdit");

  return (
    <Drawer direction={direction} open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-lg overflow-y-auto">
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
            <FieldLabel htmlFor="group-name">{commonT("name")}</FieldLabel>
            <FieldContent>
              <Input
                id="group-name"
                placeholder={t("namePlaceholder")}
                {...register("name")}
              />
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
