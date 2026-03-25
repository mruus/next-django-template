"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import { Eye, EyeOff, GithubIcon, Twitter } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { useRouter } from "@/lib/navigation";

interface LoginFormProps {
  onSuccess: (email: string, waitSeconds?: number) => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const t = useTranslations("auth");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const loginSchema = z.object({
    email: z.string().email(t("invalidEmail")),
    password: z.string().min(6, t("passwordMinLength")),
  });

  type LoginValues = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation<
    { mode: "otp"; email: string; waitSeconds?: number } | { mode: "ok" },
    Error,
    LoginValues
  >({
    mutationFn: async (data) => {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        try {
          const parsed = JSON.parse(result.error) as {
            requiresOtp?: boolean;
            waitSeconds?: number;
            email?: string;
          };
          if (parsed.requiresOtp) {
            return {
              mode: "otp",
              email: parsed.email || data.email,
              waitSeconds: parsed.waitSeconds,
            };
          }
        } catch {
          // ignore
        }
        throw new Error(result.error || "Login failed");
      }

      if (result?.ok) return { mode: "ok" };
      throw new Error("Login failed");
    },
    onSuccess: (res, variables) => {
      if (res.mode === "otp") {
        onSuccess(res.email, res.waitSeconds);
      } else {
        router.push("/");
        router.refresh();
      }
    },
    onError: (err) => {
      toast.error(err.message || "Login failed");
    },
  });

  function onSubmit(data: LoginValues) {
    loginMutation.mutate(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Field>
        <FieldLabel htmlFor="email">{t("emailAddress")}</FieldLabel>
        <FieldContent>
          <Input
            id="email"
            type="email"
            placeholder={t("yourEmail")}
            {...register("email")}
          />
          <FieldError errors={errors.email ? [errors.email] : undefined} />
        </FieldContent>
      </Field>

      <Field>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
          <a href="#" className="text-xs text-primary hover:underline">
            {t("forgotPassword")}
          </a>
        </div>
        <FieldContent>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("yourPassword")}
              className="pe-10"
              {...register("password")}
            />
            <button
              type="button"
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <EyeOff size={15} strokeWidth={1.5} />
              ) : (
                <Eye size={15} strokeWidth={1.5} />
              )}
            </button>
          </div>
          <FieldError
            errors={errors.password ? [errors.password] : undefined}
          />
        </FieldContent>
      </Field>

      <Button
        type="submit"
        className="w-full mt-1"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? t("signingIn") : t("signIn")}
      </Button>

      <div className="relative flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{t("or")}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 gap-2">
          <GithubIcon size={16} className="shrink-0" />
          {t("loginWithGithub")}
        </Button>
        <Button type="button" variant="outline" className="flex-1 gap-2">
          <Twitter size={16} className="shrink-0" />
          {t("loginWithX")}
        </Button>
      </div>
    </form>
  );
}
