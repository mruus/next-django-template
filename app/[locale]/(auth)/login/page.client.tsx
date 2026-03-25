"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import AuthCard from "../components/auth-card";
import LoginForm from "../components/login-form";
import VerifyForm from "../components/verify-form";

type Step = "login" | "verify";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

  function handleLoginSuccess(submittedEmail: string, waitSeconds?: number) {
    setEmail(submittedEmail);
    setResendCooldownSeconds(Math.max(0, waitSeconds ?? 0));
    setStep("verify");
  }

  return (
    <AuthCard
      title={step === "login" ? t("loginTitle") : t("verifyTitle")}
      description={
        step === "login" ? t("loginDescription") : t("verifyDescription")
      }
    >
      {step === "login" ? (
        <LoginForm onSuccess={handleLoginSuccess} />
      ) : (
        <VerifyForm
          email={email}
          initialResendCooldownSeconds={resendCooldownSeconds}
          onBack={() => setStep("login")}
        />
      )}
    </AuthCard>
  );
}
