"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
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
  createAllowanceAction,
  updateAllowanceAction,
  type Allowance,
} from "@/actions/personnel/settings/allowances";
import {
  listContractTypesAction,
  type ContractType,
} from "@/actions/personnel/settings/contractTypes";

type AllowanceDrawerMode = "create" | "edit";

interface AllowanceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AllowanceDrawerMode;
  selectedAllowance: Allowance | null;
  direction: "left" | "right";
}

export default function AllowanceDrawer({
  open,
  onOpenChange,
  mode,
  selectedAllowance,
  direction,
}: AllowanceDrawerProps) {
  const t = useTranslations("settings.allowances");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const { data: contractTypesData } = useQuery({
    queryKey: ["contractTypes", "options"],
    queryFn: () => listContractTypesAction(1, 1000),
  });

  const rawMessage = contractTypesData?.data?.message;
  const contractTypes: ContractType[] = Array.isArray(rawMessage)
    ? rawMessage
    : (rawMessage?.data ?? []);

  const allowanceSchema = z.object({
    contractTypeId: z
      .string()
      .trim()
      .min(1, t("validation.contractTypeRequired")),
    name: z.string().trim().min(1, t("validation.nameRequired")),
    amount: z.coerce.number().min(0, t("validation.amountRequired")),
    description: z.string().optional().default(""),
  });

  type AllowanceFormValues = z.infer<typeof allowanceSchema>;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AllowanceFormValues>({
    resolver: zodResolver(allowanceSchema),
    defaultValues: {
      contractTypeId: "",
      name: "",
      amount: 0,
      description: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      reset({
        contractTypeId: "",
        name: "",
        amount: 0,
        description: "",
      });
      return;
    }

    if (!selectedAllowance) return;

    reset({
      contractTypeId: selectedAllowance.contract_type,
      name: selectedAllowance.name,
      amount: Number(selectedAllowance.amount ?? 0),
      description: selectedAllowance.description || "",
    });
  }, [open, mode, selectedAllowance, reset]);

  const createMutation = useMutation<void, Error, AllowanceFormValues>({
    mutationFn: async (values) => {
      const res = await createAllowanceAction({
        contract_type: values.contractTypeId,
        name: values.name,
        amount: values.amount,
        description: values.description || "",
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["allowances"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string } & AllowanceFormValues
  >({
    mutationFn: async (payload) => {
      const res = await updateAllowanceAction(payload.id, {
        contract_type: payload.contractTypeId,
        name: payload.name,
        amount: payload.amount,
        description: payload.description || "",
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["allowances"] });
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"));
    },
  });

  const onSubmit = (values: AllowanceFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }

    if (!selectedAllowance) return;
    updateMutation.mutate({ id: selectedAllowance.id, ...values });
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
            <FieldLabel>{t("contractType")}</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="contractTypeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                errors={errors.contractTypeId ? [errors.contractTypeId] : undefined}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{commonT("name")}</FieldLabel>
            <FieldContent>
              <Input className="w-full" {...register("name")} />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("amount")}</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                step={0.01}
                className="w-full"
                {...register("amount")}
              />
              <FieldError errors={errors.amount ? [errors.amount] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("description")}</FieldLabel>
            <FieldContent>
              <Textarea className="w-full min-h-24" {...register("description")} />
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

