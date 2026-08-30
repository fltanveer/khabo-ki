"use client";

import { useRef, useState, useTransition } from "react";
import { savePaymentDetails } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { Button, Card, Input, Notice, Select } from "@/components/ui";
import type { PaymentDetails } from "@/lib/types";

const MAX_EDGE = 480;

// Downscaled in the browser before it ever leaves the device: a raw phone
// screenshot is a couple of megabytes, and this lands in a text column that
// gets read every time someone opens the event page.
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("decode"));
      image.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("canvas"));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function PaymentSettings({ details }: { details: PaymentDetails | null }) {
  const { t } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const [provider, setProvider] = useState(details?.provider ?? "bkash");
  const [number, setNumber] = useState(details?.number ?? "");
  const [qr, setQr] = useState<string | null>(details?.qr_image ?? null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  async function onPick(file: File | undefined) {
    setError("");
    setMessage("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError(t.payment.notImage);

    try {
      const dataUrl = await shrink(file);
      if (dataUrl.length > 400_000) return setError(t.payment.tooBig);
      setQr(dataUrl);
    } catch {
      setError(t.payment.notImage);
    }
  }

  function save() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await savePaymentDetails({ provider, number, qrImage: qr });
      if (result.error) return setError(t.payment.saveFailed);
      setMessage(t.payment.saved);
    });
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label={t.payment.provider}
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
          >
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
            <option value="other">—</option>
          </Select>
          <Input
            label={t.payment.number}
            type="tel"
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="01XXXXXXXXX"
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">{t.payment.qr}</p>
          <p className="mb-3 text-xs leading-relaxed text-muted">{t.payment.qrHelp}</p>

          {qr && (
            <div className="mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt={t.payment.qr}
                className="w-full max-w-[220px] rounded-xl border border-line bg-white p-2"
              />
            </div>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
              {qr ? t.payment.replace : t.payment.upload}
            </Button>
            {qr && (
              <Button variant="ghost" size="sm" onClick={() => setQr(null)}>
                {t.payment.removeQr}
              </Button>
            )}
          </div>
        </div>

        <Notice>{error}</Notice>
        <Notice tone="good">{message}</Notice>

        <Button disabled={pending} onClick={save} className="w-full sm:w-auto">
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </Card>
  );
}
