"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import { ArrowLeft } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { useRouter } from "@/lib/navigation";
import { resendOtpAction } from "@/actions/core/auth";

interface VerifyFormProps {
  email: string;
  initialResendCooldownSeconds?: number;
  onBack: () => void;
}

export default function VerifyForm({
  email,
  initialResendCooldownSeconds,
  onBack,
}: VerifyFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const initializedRef = useRef(false);

  const verifySchema = z.object({
    code: z
      .string()
      .length(6, t("codeExactDigits"))
      .regex(/^\d+$/, t("codeNumeric")),
  });

  type VerifyValues = z.infer<typeof verifySchema>;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const initial = initialResendCooldownSeconds ?? 0;
    setCooldownSeconds(initial > 0 ? initial : 60);
  }, [initialResendCooldownSeconds]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = window.setInterval(() => {
      setCooldownSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownSeconds]);

  const verifyMutation = useMutation<void, Error, VerifyValues>({
    mutationFn: async (values) => {
      const result = await signIn("credentials", {
        email,
        password: "",
        otpCode: values.code,
        redirect: false,
      });

      if (result?.error) throw new Error(result.error || "OTP verification failed");
      if (!result?.ok) throw new Error("OTP verification failed");
    },
    onSuccess: () => {
      router.replace("/");
      router.refresh();
    },
  });

  const resendMutation = useMutation<
    { wait_seconds?: number } | undefined,
    Error,
    void
  >({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("email", email);
      const res = await resendOtpAction(fd);
      if (!res.success) throw new Error(res.error || "Failed to resend code");
      return res.data as any;
    },
    onSuccess: (data) => {
      const next = Math.max(0, Number(data?.wait_seconds ?? 60));
      setCooldownSeconds(next > 0 ? next : 60);
    },
  });

  function onSubmit(data: VerifyValues) {
    verifyMutation.mutate(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground text-center">
        {t("verifyCodeSent")}{" "}
        <span className="font-medium text-foreground">{email}</span>
      </p>

      <Field className="w-full">
        <FieldLabel className="text-start">{t("verificationCode")}</FieldLabel>
        <FieldContent className="w-full">
          <Controller
            control={control}
            name="code"
            render={({ field }) => (
              <InputOTP
                className="w-full"
                containerClassName="w-full"
                maxLength={6}
                value={field.value}
                onChange={field.onChange}
              >
                <InputOTPGroup className="w-full">
                  <InputOTPSlot index={0} className="flex-1" />
                  <InputOTPSlot index={1} className="flex-1" />
                  <InputOTPSlot index={2} className="flex-1" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup className="w-full">
                  <InputOTPSlot index={3} className="flex-1" />
                  <InputOTPSlot index={4} className="flex-1" />
                  <InputOTPSlot index={5} className="flex-1" />
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          <FieldError errors={errors.code ? [errors.code] : undefined} />
        </FieldContent>
      </Field>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || verifyMutation.isPending}
      >
        {isSubmitting || verifyMutation.isPending ? t("verifying") : t("verify")}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <ArrowLeft size={14} strokeWidth={1.5} className="shrink-0 rtl:rotate-180" />
        {t("backToLogin")}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        {t("didntReceiveCode")}{" "}
        <button
          type="button"
          className="text-primary hover:underline font-medium"
          disabled={cooldownSeconds > 0 || resendMutation.isPending}
          onClick={() => resendMutation.mutate()}
        >
          {cooldownSeconds > 0 ? `${t("resend")} (${cooldownSeconds}s)` : t("resend")}
        </button>
      </p>
    </form>
  );
}
