"use client";

import { useState, useTransition } from "react";
import { confirmMealPayment, recordCashReceived, setMealPrice } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { Badge, Button, Empty, Input, List, Notice, Row, Section } from "@/components/ui";
import { Sheet } from "@/components/Sheet";

export type SettlementRow = {
  employeeId: string;
  name: string;
  phone: string;
  ownMeals: number;
  guestMeals: number;
  billed: number;
  paid: number;
  claimed: number;
  claims: {
    id: string;
    amount_bdt: number;
    method: string;
    claimed_at: string;
    note: string | null;
  }[];
};

export function Settlement({
  month,
  rows,
  totals,
  mealPrice,
}: {
  month: string;
  rows: SettlementRow[];
  totals: { billed: number; paid: number; claimed: number };
  adminId: string;
  mealPrice: number;
}) {
  const { t, f, n, lang } = useI18n();
  const errorText = useErrorText();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState(String(mealPrice));
  const [editingPrice, setEditingPrice] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(call: () => Promise<{ error?: Parameters<typeof errorText>[0] }>, done?: () => void) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await call();
      if (result.error) return setError(errorText(result.error));
      done?.();
    });
  }

  const outstanding = Math.max(totals.billed - totals.paid, 0);
  const recordingRow = rows.find((r) => r.employeeId === recording) ?? null;
  const recordingDue = recordingRow ? Math.max(recordingRow.billed - recordingRow.paid, 0) : 0;

  return (
    <div>
      <div className="mb-4 space-y-2">
        {!recording && !editingPrice && <Notice>{error}</Notice>}
        <Notice tone="good">{message}</Notice>
      </div>

      {/* What the office still owes this month is the number an admin acts
          on; billed and paid are the working underneath it. */}
      <section className="mb-7 rounded-card bg-surface p-6 shadow-[var(--shadow-card)]">
        <p className="flex items-center gap-1.5 text-sm font-light italic text-muted">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${outstanding > 0 ? "bg-bad" : "bg-good"}`}
          />
          {outstanding > 0 ? t.money.outstanding : t.money.settled}
        </p>
        <p className={`metric mt-3 text-[4.5rem] ${outstanding > 0 ? "text-ink" : "text-muted"}`}>
          <span className="sup">৳</span>
          {n(outstanding)}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {[
            { label: t.money.billed, value: totals.billed },
            { label: t.money.paid, value: totals.paid },
          ].map((figure) => (
            <div key={figure.label} className="rounded-inner bg-raised px-4 py-3">
              <p className="text-xs text-muted">{figure.label}</p>
              <p className="mt-1 text-[1.6rem] font-light leading-none tracking-[-0.02em] tabular-nums">
                {formatMoney(figure.value, lang)}
              </p>
            </div>
          ))}
        </div>
        {totals.claimed > 0 && (
          <p className="mt-4 text-sm text-muted">
            {f(t.settlement.awaitingTotal, { amount: formatMoney(totals.claimed, lang) })}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="text-xs text-muted">{t.settlement.price}</p>
            <p className="mt-0.5 text-xl font-medium tabular-nums">{formatMoney(mealPrice, lang)}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setPrice(String(mealPrice));
              setEditingPrice(true);
            }}
          >
            {t.common.change}
          </Button>
        </div>
      </section>

      <Section title={t.settlement.perPerson} description={t.settlement.perPersonBody}>
        {rows.length === 0 ? (
          <Empty mood="happy">{t.settlement.nobody}</Empty>
        ) : (
          <List>
            {rows.map((row) => {
              const due = Math.max(row.billed - row.paid, 0);

              return (
                <Row
                  key={row.employeeId}
                  className="flex-col items-stretch gap-2.5 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {f(t.settlement.meals, {
                          own: n(row.ownMeals),
                          guest: n(row.guestMeals),
                        })}{" "}
                        · {formatMoney(row.billed, lang)}
                      </p>
                      {row.claims.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {row.claims.map((claim) => (
                            <li key={claim.id} className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-muted">
                                {formatMoney(claim.amount_bdt, lang)} ·{" "}
                                {claim.method === "cash" ? t.money.cash : t.money.qr} ·{" "}
                                {formatDateTime(claim.claimed_at, lang)}
                              </span>
                              <Button
                                size="sm"
                                disabled={pending}
                                onClick={() => run(() => confirmMealPayment(claim.id))}
                              >
                                {t.events.confirm}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {due === 0 ? (
                      <Badge tone="good">{t.money.settled}</Badge>
                    ) : (
                      <Badge tone="warn">{formatMoney(due, lang)}</Badge>
                    )}
                  </div>

                  {due > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="sm:shrink-0"
                      disabled={pending}
                      onClick={() => {
                        setError("");
                        setRecording(row.employeeId);
                        setAmount("");
                      }}
                    >
                      {t.settlement.recordCash}
                    </Button>
                  )}
                </Row>
              );
            })}
          </List>
        )}
      </Section>

      <Sheet
        open={recordingRow !== null}
        onClose={() => {
          setError("");
          setRecording(null);
        }}
        title={t.settlement.recordCash}
        description={recordingRow ? `${recordingRow.name} · ${formatMoney(recordingDue, lang)}` : undefined}
        footer={
          <>
            <Button
              variant="secondary"
              className="shrink-0 px-6"
              disabled={pending}
              onClick={() => setRecording(null)}
            >
              {t.common.cancel}
            </Button>
            <Button
              className="flex-1"
              disabled={pending || !recordingRow}
              onClick={() => {
                if (!recordingRow) return;
                const row = recordingRow;
                run(
                  () => recordCashReceived(row.employeeId, month, Number(amount || recordingDue)),
                  () => {
                    setRecording(null);
                    setAmount("");
                    setMessage(f(t.settlement.recorded, { name: row.name }));
                  },
                );
              }}
            >
              {t.settlement.received}
            </Button>
          </>
        }
      >
        <Input
          label={t.money.amount}
          inputMode="numeric"
          value={amount}
          placeholder={String(recordingDue)}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
        />
        {recording && <Notice>{error}</Notice>}
      </Sheet>

      <Sheet
        open={editingPrice}
        onClose={() => {
          setError("");
          setEditingPrice(false);
        }}
        title={t.settlement.priceTitle}
        description={t.settlement.priceBody}
        footer={
          <>
            <Button
              variant="secondary"
              className="shrink-0 px-6"
              disabled={pending}
              onClick={() => setEditingPrice(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              className="flex-1"
              disabled={pending || price === String(mealPrice) || price === ""}
              onClick={() =>
                run(
                  () => setMealPrice(Number(price)),
                  () => {
                    setEditingPrice(false);
                    setMessage(t.settlement.priceSaved);
                  },
                )
              }
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        <Input
          label={t.settlement.price}
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
        />
        {editingPrice && <Notice>{error}</Notice>}
      </Sheet>
    </div>
  );
}
