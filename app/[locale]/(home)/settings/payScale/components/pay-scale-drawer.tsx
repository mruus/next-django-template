"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createPayScaleAction,
  updatePayScaleAction,
  type PayScale,
} from "@/actions/personnel/settings/payScale";
import { listRanksAction, type Rank } from "@/actions/personnel/settings/ranks";
import {
  listContractTypesAction,
  type ContractType,
} from "@/actions/personnel/settings/contractTypes";

type PayScaleDrawerMode = "create" | "edit";

interface PayScaleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PayScaleDrawerMode;
  selectedPayScale: PayScale | null;
  direction: "left" | "right";
}

export default function PayScaleDrawer({
  open,
  onOpenChange,
  mode,
  selectedPayScale,
  direction,
}: PayScaleDrawerProps) {
  const t = useTranslations("settings.payScale");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const { data: ranksData } = useQuery({
    queryKey: ["ranks", "options"],
    queryFn: () => listRanksAction(1, 1000),
  });

  const { data: contractTypesData } = useQuery({
    queryKey: ["contractTypes", "options"],
    queryFn: () => listContractTypesAction(1, 1000),
  });

  const rawRanksMessage = ranksData?.data?.message;
  const ranks: Rank[] = Array.isArray(rawRanksMessage)
    ? rawRanksMessage
    : (rawRanksMessage?.data ?? []);

  const rawContractTypesMessage = contractTypesData?.data?.message;
  const contractTypes: ContractType[] = Array.isArray(rawContractTypesMessage)
    ? rawContractTypesMessage
    : (rawContractTypesMessage?.data ?? []);

  const payScaleSchema = z.object({
    rankId: z.string().trim().min(1, t("validation.rankRequired")),
    contractTypeId: z
      .string()
      .trim()
      .min(1, t("validation.contractTypeRequired")),
    salary: z.coerce.number().min(0, t("validation.salaryRequired")),
    iida: z.coerce.number().min(0, t("validation.iidaRequired")),
    deduction: z
      .coerce.number()
      .min(0, t("validation.deductionRequired")),
    insurance: z
      .coerce.number()
      .min(0, t("validation.insuranceRequired")),
    ageOfRetirement: z
      .coerce.number()
      .int()
      .min(0, t("validation.ageOfRetirementRequired")),
    slug: z.string().trim().optional().default(""),
  });

  type PayScaleFormValues = z.infer<typeof payScaleSchema>;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayScaleFormValues>({
    resolver: zodResolver(payScaleSchema),
    defaultValues: {
      rankId: "",
      contractTypeId: "",
      salary: 0,
      iida: 0,
      deduction: 0,
      insurance: 0,
      ageOfRetirement: 0,
      slug: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({
        rankId: "",
        contractTypeId: "",
        salary: 0,
        iida: 0,
        deduction: 0,
        insurance: 0,
        ageOfRetirement: 0,
        slug: "",
      });
      return;
    }

    if (!selectedPayScale) return;

    reset({
      rankId: selectedPayScale.rank,
      contractTypeId: selectedPayScale.contract_type,
      salary: Number(selectedPayScale.salary ?? 0),
      iida: Number(selectedPayScale.iida ?? 0),
      deduction: Number(selectedPayScale.deduction ?? 0),
      insurance: Number(selectedPayScale.insurance ?? 0),
      ageOfRetirement: Number(selectedPayScale.age_of_retirement ?? 0),
      slug: selectedPayScale.slug ?? "",
    });
  }, [open, mode, selectedPayScale, reset]);

  const createMutation = useMutation<void, Error, PayScaleFormValues>({
    mutationFn: async (values) => {
      const res = await createPayScaleAction({
        rank: values.rankId,
        contract_type: values.contractTypeId,
        salary: values.salary,
        iida: values.iida,
        deduction: values.deduction,
        insurance: values.insurance,
        age_of_retirement: values.ageOfRetirement,
        slug: values.slug,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["payScales"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string } & PayScaleFormValues
  >({
    mutationFn: async (payload) => {
      const res = await updatePayScaleAction(payload.id, {
        rank: payload.rankId,
        contract_type: payload.contractTypeId,
        salary: payload.salary,
        iida: payload.iida,
        deduction: payload.deduction,
        insurance: payload.insurance,
        age_of_retirement: payload.ageOfRetirement,
        slug: payload.slug,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["payScales"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const onSubmit = (values: PayScaleFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }

    if (!selectedPayScale) return;
    updateMutation.mutate({ id: selectedPayScale.id, ...values });
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
            <FieldLabel>{t("rank")}</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="rankId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("rank")} />
                    </SelectTrigger>
                    <SelectContent>
                      {ranks.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={errors.rankId ? [errors.rankId] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("contractType")}</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="contractTypeId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("contractType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map((ct) => (
                        <SelectItem key={ct.id} value={ct.id}>
                          {ct.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError
                errors={
                  errors.contractTypeId ? [errors.contractTypeId] : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("salary")}</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                step={0.01}
                className="w-full"
                {...register("salary")}
              />
              <FieldError errors={errors.salary ? [errors.salary] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("iida")}</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                step={0.01}
                className="w-full"
                {...register("iida")}
              />
              <FieldError errors={errors.iida ? [errors.iida] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("deduction")}</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                step={0.01}
                className="w-full"
                {...register("deduction")}
              />
              <FieldError
                errors={errors.deduction ? [errors.deduction] : undefined}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("insurance")}</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                step={0.01}
                className="w-full"
                {...register("insurance")}
              />
              <FieldError
                errors={errors.insurance ? [errors.insurance] : undefined}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("ageOfRetirement")}</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                step={1}
                className="w-full"
                {...register("ageOfRetirement")}
              />
              <FieldError
                errors={
                  errors.ageOfRetirement ? [errors.ageOfRetirement] : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="payScale-slug">{t("slug")}</FieldLabel>
            <FieldContent>
              <Input
                id="payScale-slug"
                className="w-full"
                {...register("slug")}
              />
              <FieldError errors={errors.slug ? [errors.slug] : undefined} />
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

