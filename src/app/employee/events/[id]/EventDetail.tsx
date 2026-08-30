"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  confirmPayment,
  payEventShare,
  setCustomAmount,
  setEventStatus,
  setRsvp,
} from "../actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { PayeeDetails } from "@/components/PayeeDetails";
import { formatMoney, previewSplit } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  List,
  Notice,
  Row,
  Section,
  Select,
} from "@/components/ui";
import type { PaymentDetails } from "@/lib/types";

type Participant = {
  id: string;
  name: string;
  rsvp: "pending" | "in" | "out";
  custom: number | null;
  share: number;
};

type Claim = {
  id: string;
  payer_id: string;
  amount_bdt: number;
  method: string;
  note: string | null;
  claimed_at: string;
  confirmed_at: string | null;
};

export function EventDetail({
  event,
  me,
  participants,
  payments,
  collector,
  collectorPayment,
}: {
  event: {
    id: string;
    created_by: string;
    collector_id: string;
    title: string;
    cost_mode: "treat" | "shared";
    total_amount_bdt: number | null;
    status: "announced" | "settled" | "cancelled";
  };
  me: string;
  participants: Participant[];
  payments: Claim[];
  collector: { id: string; name: string };
  collectorPayment: PaymentDetails | null;
}) {
  const { t, f, lang } = useI18n();
  const errorText = useErrorText();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // The split reflows the moment an RSVP or a pledge changes. Showing the old
  // numbers for a round trip makes people think their tap didn't register.
  const [rows, setRows] = useOptimistic(participants, (_cur, next: Participant[]) => next);

  const [editingAmount, setEditingAmount] = useState(false);
  const [amountDraft, setAmountDraft] = useState("");
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "qr">("qr");

  const mine = rows.find((p) => p.id === me);
  const shared = event.cost_mode === "shared";
  const live = event.status === "announced";
  const isCollector = collector.id === me;
  const canManage = event.created_by === me;

  const going = rows.filter((p) => p.rsvp === "in");
  const out = rows.filter((p) => p.rsvp === "out");
  const waiting = rows.filter((p) => p.rsvp === "pending");
  const goingCount = going.length;
  const myShare = mine?.share ?? 0;

  const myPayments = payments.filter((p) => p.payer_id === me);
  const myPaid = myPayments.filter((p) => p.confirmed_at).reduce((s, p) => s + p.amount_bdt, 0);
  const myPendingClaim = myPayments
    .filter((p) => !p.confirmed_at)
    .reduce((s, p) => s + p.amount_bdt, 0);
  const myOutstanding = Math.max(myShare - myPaid, 0);

  const collectedTotal = payments
    .filter((p) => p.confirmed_at)
    .reduce((s, p) => s + p.amount_bdt, 0);
  const target = event.total_amount_bdt ?? 0;

  // Recompute locally so the optimistic rows carry fresh shares too.
  function withSplit(next: Participant[]): Participant[] {
    if (!shared) return next;
    const map = previewSplit(
      target,
      next.map((p) => ({ id: p.id, rsvp: p.rsvp, custom: p.custom })),
    );
    return next.map((p) => ({ ...p, share: map.get(p.id) ?? 0 }));
  }

  function run(mutate: (rows: Participant[]) => Participant[], call: () => Promise<{ error?: Parameters<typeof errorText>[0] }>) {
    setError("");
    startTransition(async () => {
      setRows(withSplit(mutate(rows)));
      const result = await call();
      if (result.error) setError(errorText(result.error));
    });
  }

  const claimsToConfirm = payments.filter((p) => !p.confirmed_at);

  return (
    <>
      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      {event.status === "cancelled" && (
        <div className="mb-4">
          <Notice tone="warn">{t.events.cancelled}</Notice>
        </div>
      )}

      <Section title={t.events.rsvpAsk} aside={<Badge>{f(t.events.inCount, { count: goingCount })}</Badge>}>
        <div className="flex gap-2">
          <Button
            variant={mine?.rsvp === "in" ? "primary" : "secondary"}
            className="flex-1"
            disabled={pending || !live}
            onClick={() =>
              run(
                (cur) => cur.map((p) => (p.id === me ? { ...p, rsvp: "in" as const } : p)),
                () => setRsvp(event.id, "in"),
              )
            }
          >
            {t.events.going}
          </Button>
          <Button
            variant={mine?.rsvp === "out" ? "primary" : "secondary"}
            className="flex-1"
            disabled={pending || !live}
            onClick={() =>
              run(
                (cur) => cur.map((p) => (p.id === me ? { ...p, rsvp: "out" as const } : p)),
                () => setRsvp(event.id, "out"),
              )
            }
          >
            {t.events.notGoing}
          </Button>
        </div>
      </Section>

      {!shared ? (
        <Card className="mb-6 border-good/40 bg-good-soft">
          <p className="text-sm">{f(t.events.treatNote, { name: collector.name })}</p>
        </Card>
      ) : (
        <>
          <Section title={t.events.yourShare} description={t.events.shareNote}>
            <Card>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-semibold tabular-nums">
                  {formatMoney(myShare, lang)}
                </span>
                <span className="text-sm text-muted">
                  {f(t.events.collected, {
                    paid: formatMoney(collectedTotal, lang),
                    total: formatMoney(target, lang),
                  })}
                </span>
              </div>

              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-raised"
                role="progressbar"
                aria-valuenow={collectedTotal}
                aria-valuemin={0}
                aria-valuemax={target}
              >
                <div
                  className="h-full rounded-full bg-good transition-all"
                  style={{ width: `${target > 0 ? Math.min((collectedTotal / target) * 100, 100) : 0}%` }}
                />
              </div>

              {mine?.rsvp === "in" && live && (
                <div className="mt-4">
                  {editingAmount ? (
                    <div className="space-y-3">
                      <Input
                        label={t.events.customAmount}
                        hint={t.events.customHint}
                        inputMode="numeric"
                        value={amountDraft}
                        onChange={(e) => setAmountDraft(e.target.value.replace(/[^\d]/g, ""))}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          className="flex-1 sm:flex-none"
                          disabled={pending}
                          onClick={() => setEditingAmount(false)}
                        >
                          {t.common.cancel}
                        </Button>
                        <Button
                          className="flex-1 sm:flex-none"
                          disabled={pending || amountDraft === ""}
                          onClick={() => {
                            const value = Number(amountDraft);
                            setEditingAmount(false);
                            run(
                              (cur) =>
                                cur.map((p) => (p.id === me ? { ...p, custom: value } : p)),
                              () => setCustomAmount(event.id, value),
                            );
                          }}
                        >
                          {t.events.saveAmount}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setAmountDraft(String(mine.custom ?? myShare));
                          setEditingAmount(true);
                        }}
                      >
                        {t.events.changeAmount}
                      </Button>
                      {mine.custom !== null && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(
                              (cur) =>
                                cur.map((p) => (p.id === me ? { ...p, custom: null } : p)),
                              () => setCustomAmount(event.id, null),
                            )
                          }
                        >
                          {t.events.backToEven}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </Section>

          {mine?.rsvp === "in" && !isCollector && myShare > 0 && (
            <Section title={f(t.events.payVia, { name: collector.name })}>
              <PayeeDetails name={collector.name} details={collectorPayment} />

              <div className="mt-3">
                {myOutstanding === 0 && myPendingClaim === 0 ? (
                  <Notice tone="good">{t.money.settled}</Notice>
                ) : paying ? (
                  <Card>
                    <div className="space-y-3">
                      <Input
                        label={t.money.amount}
                        inputMode="numeric"
                        value={payAmount}
                        placeholder={String(myOutstanding)}
                        onChange={(e) => setPayAmount(e.target.value.replace(/[^\d]/g, ""))}
                      />
                      <Select
                        label={t.money.method}
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as "cash" | "qr")}
                      >
                        <option value="qr">{t.money.qr}</option>
                        <option value="cash">{t.money.cash}</option>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          className="flex-1 sm:flex-none"
                          disabled={pending}
                          onClick={() => setPaying(false)}
                        >
                          {t.common.cancel}
                        </Button>
                        <Button
                          className="flex-1 sm:flex-none"
                          disabled={pending}
                          onClick={() => {
                            const value = Number(payAmount || myOutstanding);
                            setError("");
                            startTransition(async () => {
                              const result = await payEventShare(
                                event.id,
                                value,
                                payMethod,
                                "",
                              );
                              if (result.error) setError(errorText(result.error));
                              else {
                                setPaying(false);
                                setPayAmount("");
                              }
                            });
                          }}
                        >
                          {t.money.submit}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Button block variant="secondary" onClick={() => setPaying(true)}>
                    {t.events.markPaid}
                  </Button>
                )}

                {myPendingClaim > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    {f(t.events.awaiting, { name: collector.name })}
                  </p>
                )}
              </div>
            </Section>
          )}

          {isCollector && claimsToConfirm.length > 0 && (
            <Section title={t.events.confirm}>
              <List>
                {claimsToConfirm.map((claim) => {
                  const payer = rows.find((p) => p.id === claim.payer_id);
                  return (
                    <Row key={claim.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {payer?.name ?? "—"}
                          <span className="font-normal text-muted">
                            {" · "}
                            {formatMoney(claim.amount_bdt, lang)}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {claim.method === "cash" ? t.money.cash : t.money.qr} ·{" "}
                          {formatDateTime(claim.claimed_at, lang)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="sm:shrink-0"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await confirmPayment(claim.id);
                            if (result.error) setError(errorText(result.error));
                          })
                        }
                      >
                        {t.events.confirm}
                      </Button>
                    </Row>
                  );
                })}
              </List>
            </Section>
          )}
        </>
      )}

      <Section
        title={t.events.whoOwes}
        aside={<Badge tone="brand">{f(t.events.inCount, { count: goingCount })}</Badge>}
      >
        {going.length === 0 ? (
          <Empty>{t.events.nobodyIn}</Empty>
        ) : (
          <List>
            {going.map((person) => {
              const theirPaid = payments
                .filter((p) => p.payer_id === person.id && p.confirmed_at)
                .reduce((sum, p) => sum + p.amount_bdt, 0);
              return (
                <Row key={person.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {person.name}
                      {person.id === me && <span className="text-muted"> ({t.admin.you})</span>}
                    </p>
                    {shared && person.custom !== null && (
                      <p className="mt-0.5 text-xs text-brand">{t.events.chosenAmount}</p>
                    )}
                  </div>
                  {shared && (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums">
                        {formatMoney(person.share, lang)}
                      </span>
                      {person.share > 0 && theirPaid >= person.share && (
                        <Badge tone="good">{t.money.paid}</Badge>
                      )}
                    </div>
                  )}
                </Row>
              );
            })}
          </List>
        )}

        {/* Everyone in the office is invited, so the not-yet-replied list is
            most of the company on day one. A count says as much as 27 names. */}
        {(out.length > 0 || waiting.length > 0) && (
          <p className="mt-3 text-xs text-muted">
            {out.length > 0 && f(t.events.outCount, { count: out.length })}
            {out.length > 0 && waiting.length > 0 && " · "}
            {waiting.length > 0 && f(t.events.waitingCount, { count: waiting.length })}
          </p>
        )}
      </Section>

      {canManage && event.status === "announced" && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setEventStatus(event.id, "settled");
                if (result.error) setError(errorText(result.error));
              })
            }
          >
            {t.events.settle}
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (!confirm(t.events.cancelWarn)) return;
              startTransition(async () => {
                const result = await setEventStatus(event.id, "cancelled");
                if (result.error) setError(errorText(result.error));
              });
            }}
          >
            {t.events.cancelEvent}
          </Button>
        </div>
      )}
    </>
  );
}
