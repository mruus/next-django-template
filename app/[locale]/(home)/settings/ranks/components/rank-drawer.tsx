"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createRankAction,
  updateRankAction,
  type Rank,
} from "@/actions/personnel/settings/ranks";

type RankDrawerMode = "create" | "edit";

interface RankDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: RankDrawerMode;
  selectedRank: Rank | null;
  direction: "left" | "right";
}

export default function RankDrawer({
  open,
  onOpenChange,
  mode,
  selectedRank,
  direction,
}: RankDrawerProps) {
  const t = useTranslations("settings.ranks");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const rankSchema = z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")),
    years: z.coerce.number().int().min(0),
    months: z.coerce.number().int().min(0).max(11),
  });

  type RankFormValues = z.infer<typeof rankSchema>;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RankFormValues>({
    resolver: zodResolver(rankSchema),
    defaultValues: { name: "", years: 0, months: 0 },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({ name: "", years: 0, months: 0 });
      return;
    }

    if (!selectedRank) return;

    const totalMonths = selectedRank.months_of_service || 0;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    reset({
      name: selectedRank.name,
      years,
      months,
    });
  }, [open, mode, selectedRank, reset]);

  const createMutation = useMutation<void, Error, RankFormValues>({
    mutationFn: async (values) => {
      const monthsOfService = values.years * 12 + values.months;
      const res = await createRankAction(values.name, monthsOfService);
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["ranks"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string } & RankFormValues
  >({
    mutationFn: async (payload) => {
      const monthsOfService = payload.years * 12 + payload.months;
      const res = await updateRankAction(payload.id, {
        name: payload.name,
        months_of_service: monthsOfService,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["ranks"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const onSubmit = (values: RankFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }

    if (!selectedRank) return;

    updateMutation.mutate({ id: selectedRank.id, ...values });
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 flex flex-col gap-5">
          <Field>
            <FieldLabel htmlFor="rank-name">{commonT("name")}</FieldLabel>
            <FieldContent>
              <Input id="rank-name" className="w-full" {...register("name")} />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="rank-years">{t("years")}</FieldLabel>
            <FieldContent>
              <Input
                id="rank-years"
                type="number"
                min={0}
                step={1}
                className="w-full"
                {...register("years")}
              />
              <FieldError errors={errors.years ? [errors.years] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="rank-months">{t("months")}</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="months"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {idx} {t("months")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError
                errors={errors.months ? [errors.months] : undefined}
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

