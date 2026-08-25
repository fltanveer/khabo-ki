"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidPhone, phoneToEmail } from "@/lib/phone";
import { Button, Card, Input, Notice } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isValidPhone(phone)) {
      setError("Enter a valid phone number.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    });
    setBusy(false);

    if (authError) {
      setError("Wrong phone number or password.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Khabo Ki?</h1>
      <p className="mb-6 text-sm text-muted">Sign in to pick today&apos;s lunch.</p>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Phone number"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Notice>{error}</Notice>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="text-brand underline">
          Register
        </Link>
      </p>
    </main>
  );
}
