"use client";

import { useState } from "react";
import Link from "next/link";
import { isValidPhone } from "@/lib/phone";
import { registerEmployee } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, Card, Input, Notice } from "@/components/ui";

export default function RegisterPage() {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) return setError(t.auth.invalidName);
    if (!isValidPhone(phone)) return setError(t.auth.invalidPhone);
    if (password.length < 8) return setError(t.auth.shortPassword);

    setBusy(true);
    const result = await registerEmployee(name, phone, password);
    setBusy(false);

    if (result.error) return setError(errorText(result.error));
    setDone(true);
  }

  if (done) {
    return (
      <AuthLayout title={t.auth.registrationReceived}>
        <Card>
          <p className="text-sm leading-relaxed text-muted">{t.auth.registrationBody}</p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-brand underline underline-offset-2"
          >
            {t.auth.backToSignIn}
          </Link>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t.auth.register}
      subtitle={t.auth.registerSubtitle}
      footer={
        <>
          {t.auth.alreadyRegistered}{" "}
          <Link href="/login" className="font-medium text-brand underline underline-offset-2">
            {t.common.signIn}
          </Link>
        </>
      }
    >
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label={t.auth.fullName}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            label={t.auth.password}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Notice>{error}</Notice>
          <Button type="submit" disabled={busy} block>
            {busy ? t.auth.creatingAccount : t.auth.createAccount}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
