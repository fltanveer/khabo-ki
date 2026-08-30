"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestReset, resetPassword } from "./actions";
import { isValidPhone } from "@/lib/phone";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, Card, Input, Notice } from "@/components/ui";

// Two steps, one page. Asking sends the request to the admin; entering the
// code the admin gives back sets the new password. Someone who already has a
// code can jump straight to the second step.
type Step = "ask" | "code" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();
  const errorText = useErrorText();

  const [step, setStep] = useState<Step>("ask");
  // Only true when this visit sent the request — someone arriving with a code
  // already in hand shouldn't be told "request sent".
  const [asked, setAsked] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function ask() {
    setError("");
    if (!isValidPhone(phone)) return setError(t.auth.invalidPhone);

    startTransition(async () => {
      const result = await requestReset(phone);
      if (result.error) return setError(errorText(result.error));
      setAsked(true);
      setStep("code");
    });
  }

  function submitNewPassword() {
    setError("");
    if (!isValidPhone(phone)) return setError(t.auth.invalidPhone);
    if (password.length < 8) return setError(t.auth.shortPassword);

    startTransition(async () => {
      const result = await resetPassword(phone, code, password);
      if (result.error) return setError(errorText(result.error));
      setStep("done");
    });
  }

  if (step === "done") {
    return (
      <AuthLayout title={t.reset.doneTitle} subtitle={t.reset.doneBody}>
        <Card>
          <Button block onClick={() => router.replace("/login")}>
            {t.common.signIn}
          </Button>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t.reset.title}
      subtitle={step === "ask" ? t.reset.askSubtitle : t.reset.codeSubtitle}
      footer={
        <Link href="/login" className="font-medium text-brand underline underline-offset-2">
          {t.auth.backToSignIn}
        </Link>
      }
    >
      <Card>
        {step === "ask" ? (
          <div className="space-y-4">
            <Input
              label={t.auth.phone}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.auth.phonePlaceholder}
            />
            <Notice>{error}</Notice>
            <Button block disabled={pending} onClick={ask}>
              {pending ? t.reset.asking : t.reset.askButton}
            </Button>
            <button
              type="button"
              className="block w-full text-center text-sm text-muted underline underline-offset-2"
              onClick={() => {
                setError("");
                setStep("code");
              }}
            >
              {t.reset.haveCode}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {asked && <Notice tone="warn">{t.reset.askedBody}</Notice>}
            <Input
              label={t.auth.phone}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.auth.phonePlaceholder}
            />
            <Input
              label={t.reset.code}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="tracking-[0.4em]"
            />
            <Input
              label={t.reset.newPassword}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={t.auth.shortPassword}
            />
            <Notice>{error}</Notice>
            <Button block disabled={pending} onClick={submitNewPassword}>
              {pending ? t.common.saving : t.reset.changeButton}
            </Button>
            <button
              type="button"
              className="block w-full text-center text-sm text-muted underline underline-offset-2"
              onClick={() => {
                setError("");
                setAsked(false);
                setStep("ask");
              }}
            >
              {t.reset.askAgain}
            </button>
          </div>
        )}
      </Card>
    </AuthLayout>
  );
}
