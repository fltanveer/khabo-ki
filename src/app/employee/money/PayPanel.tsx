"use client";

import { useState, useTransition } from "react";
import { recordMealPayment, withdrawPayment } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { Badge, Button, Card, Input, List, Notice, Row, Section, Select } from "@/components/ui";
import { PayeeDetails } from "@/components/PayeeDetails";
import type { PaymentDetails } from "@/lib/types";

type Claim = {
  id: string;
  amount_bdt: number;
  method: string;
  note: string | null;
  claimed_at: string;
  confirmed_at: string | null;
};

export function PayPanel({
  month,
  outstanding,
  admin,
  adminPayment,
  payments,
}: {
  month: string;
  outstanding: number;
  admin: { id: string; name: string } | null;
  adminPayment: PaymentDetails | null;
  payments: Claim[];
}) {
  const { t, f, lang } = useI18n();
  const errorText = useErrorText();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "qr">("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError(t.money.invalidAmount);

    startTransition(async () => {
      const result = await recordMealPayment(month, value, method, note);
      if (result.error) return setError(errorText(result.error));
      setOpen(false);
      setAmount("");
      setNote("");
    });
  }

  return (
    <Section title={admin ? f(t.money.payTo, { name: admin.name }) : t.money.recordPayment}>
      {error && (
        <div className="mb-3">
          <Notice>{error}</Notice>
        </div>
      )}

      {!admin ? (
        <Notice tone="warn">{t.money.noAdmin}</Notice>
      ) : (
        <>
          <PayeeDetails name={admin.name} details={adminPayment} />

          {open ? (
            <Card className="mt-3">
              <div className="space-y-3">
                <Input
                  label={t.money.amount}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder={String(outstanding || "")}
                />
                <Select
                  label={t.money.method}
                  value={method}
                  onChange={(e) => setMethod(e.target.value as "cash" | "qr")}
                >
                  <option value="cash">{t.money.cash}</option>
                  <option value="qr">{t.money.qr}</option>
                </Select>
                <Input
                  label={t.money.note}
                  value={note}
                  maxLength={200}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 sm:flex-none"
                    disabled={pending}
                    onClick={() => {
                      setError("");
                      setOpen(false);
                    }}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button className="flex-1 sm:flex-none" disabled={pending} onClick={submit}>
                    {pending ? t.common.saving : t.money.submit}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Button className="mt-3" variant="secondary" block onClick={() => setOpen(true)}>
              {t.money.recordPayment}
            </Button>
          )}
        </>
      )}

      {payments.length > 0 && (
        <div className="mt-4">
          <List>
            {payments.map((payment) => (
              <Row key={payment.id}>
                <div className="min-w-0">
                  <p className="text-sm font-medium tabular-nums">
                    {formatMoney(payment.amount_bdt, lang)}
                    <span className="font-normal text-muted">
                      {" · "}
                      {payment.method === "cash" ? t.money.cash : t.money.qr}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {formatDateTime(payment.claimed_at, lang)}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {payment.confirmed_at ? (
                    <Badge tone="good">{t.money.confirmed}</Badge>
                  ) : (
                    <>
                      <Badge tone="warn">{t.money.claimed}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await withdrawPayment(payment.id);
                            if (result.error) setError(errorText(result.error));
                          })
                        }
                      >
                        {t.money.withdraw}
                      </Button>
                    </>
                  )}
                </div>
              </Row>
            ))}
          </List>
        </div>
      )}
    </Section>
  );
}
