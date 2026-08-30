"use client";

import { useState, useTransition } from "react";
import { confirmMealPayment, recordCashReceived, setMealPrice } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { Badge, Button, Card, Empty, Input, List, Notice, Row, Section } from "@/components/ui";

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

  return (
    <div>
      <div className="mb-4 space-y-2">
        <Notice>{error}</Notice>
        <Notice tone="good">{message}</Notice>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted">{t.money.billed}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatMoney(totals.billed, lang)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">{t.money.paid}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-good">
              {formatMoney(totals.paid, lang)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">{t.money.outstanding}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-bad">
              {formatMoney(outstanding, lang)}
            </p>
          </div>
        </div>
        {totals.claimed > 0 && (
          <p className="mt-3 border-t border-line pt-3 text-center text-xs text-muted">
            {f(t.settlement.awaitingTotal, { amount: formatMoney(totals.claimed, lang) })}
          </p>
        )}
      </Card>

      <Section title={t.settlement.perPerson} description={t.settlement.perPersonBody}>
        {rows.length === 0 ? (
          <Empty>{t.settlement.nobody}</Empty>
        ) : (
          <List>
            {rows.map((row) => {
              const due = Math.max(row.billed - row.paid, 0);
              const isOpen = recording === row.employeeId;

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

                  {isOpen ? (
                    <div className="flex gap-2 sm:shrink-0">
                      <Input
                        inputMode="numeric"
                        value={amount}
                        placeholder={String(due)}
                        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                        className="max-w-[7rem]"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => setRecording(null)}
                      >
                        {t.common.cancel}
                      </Button>
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              recordCashReceived(
                                row.employeeId,
                                month,
                                Number(amount || due),
                              ),
                            () => {
                              setRecording(null);
                              setAmount("");
                              setMessage(f(t.settlement.recorded, { name: row.name }));
                            },
                          )
                        }
                      >
                        {t.settlement.received}
                      </Button>
                    </div>
                  ) : (
                    due > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="sm:shrink-0"
                        disabled={pending}
                        onClick={() => {
                          setRecording(row.employeeId);
                          setAmount("");
                        }}
                      >
                        {t.settlement.recordCash}
                      </Button>
                    )
                  )}
                </Row>
              );
            })}
          </List>
        )}
      </Section>

      <Section title={t.settlement.priceTitle} description={t.settlement.priceBody}>
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label={t.settlement.price}
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
              className="max-w-[8rem]"
            />
            <Button
              variant="secondary"
              disabled={pending || price === String(mealPrice) || price === ""}
              onClick={() =>
                run(
                  () => setMealPrice(Number(price)),
                  () => setMessage(t.settlement.priceSaved),
                )
              }
            >
              {t.common.save}
            </Button>
          </div>
        </Card>
      </Section>
    </div>
  );
}
