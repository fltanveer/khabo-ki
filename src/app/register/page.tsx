"use client";

import { useState } from "react";
import Link from "next/link";
import { isValidPhone } from "@/lib/phone";
import { registerEmployee } from "./actions";
import { Button, Card, Input, Notice } from "@/components/ui";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) return setError("Enter your full name.");
    if (!isValidPhone(phone)) return setError("Enter a valid phone number.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setBusy(true);
    const result = await registerEmployee(name, phone, password);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
        <Card>
          <h1 className="text-xl font-semibold">Registration received</h1>
          <p className="mt-2 text-sm text-muted">
            An admin needs to approve your account before you can order. You&apos;ll be able to
            sign in once that&apos;s done.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm text-brand underline">
            Back to sign in
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Register</h1>
      <p className="mb-6 text-sm text-muted">An admin approves new accounts before first order.</p>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Notice>{error}</Notice>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="text-brand underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
