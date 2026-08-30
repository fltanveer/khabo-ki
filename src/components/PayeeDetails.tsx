"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";
import { Card } from "./ui";
import type { PaymentDetails } from "@/lib/types";

const PROVIDER_LABEL: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  other: "Wallet",
};

// Where to send the money. The QR is the collector's own screenshot — a code
// generated from a phone number would not scan in bKash, so there is nothing
// clever to do here beyond showing what they gave us.
export function PayeeDetails({
  name,
  details,
}: {
  name: string;
  details: PaymentDetails | null;
}) {
  const { t, f } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!details?.number && !details?.qr_image) {
    return (
      <Card>
        <p className="text-sm text-muted">{f(t.events.noQr, { name })}</p>
      </Card>
    );
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard is blocked in some in-app browsers; the number is on screen
      // anyway, so there is nothing to recover from.
    }
  }

  return (
    <Card>
      <p className="text-sm font-medium">{f(t.events.payVia, { name })}</p>

      {details.number && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-raised px-2.5 py-1 text-xs font-medium text-muted">
            {PROVIDER_LABEL[details.provider ?? "other"]}
          </span>
          <span className="font-mono text-base tracking-wide tabular-nums">{details.number}</span>
          <button
            type="button"
            onClick={() => copy(details.number!)}
            className="min-h-11 rounded-lg border border-line-strong px-3 text-xs font-medium text-muted transition hover:bg-raised hover:text-ink sm:min-h-8"
          >
            {copied ? t.events.copied : t.events.copyNumber}
          </button>
        </div>
      )}

      {details.qr_image && (
        <div className="mt-3">
          {/* A data: URL the collector uploaded — next/image would only add a
              loader in front of bytes we already hold. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={details.qr_image}
            alt={f(t.events.payVia, { name })}
            className="w-full max-w-[220px] rounded-xl border border-line bg-white p-2"
          />
        </div>
      )}
    </Card>
  );
}
