"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidPhone, phoneToEmail } from "@/lib/phone";
import { useI18n } from "@/components/I18nProvider";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, Card, Input, Notice } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isValidPhone(phone)) return setError(t.auth.invalidPhone);

    setBusy(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    });
    setBusy(false);

    if (authError) return setError(t.auth.badCredentials);

    router.replace("/");
    router.refresh();
  }

  return (
    <AuthLayout
      title={t.auth.signInSubtitle}
      footer={
        <>
          {t.auth.newHere}{" "}
          <Link href="/register" className="font-medium text-brand underline underline-offset-2">
            {t.auth.register}
          </Link>
        </>
      }
    >
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Notice>{error}</Notice>
          <Button type="submit" disabled={busy} block>
            {busy ? t.common.signingIn : t.common.signIn}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
