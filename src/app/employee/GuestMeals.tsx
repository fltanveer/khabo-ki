"use client";

import { useState, useTransition } from "react";
import { addGuestMeal, removeGuestMeal } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { formatMoney } from "@/lib/money";
import { Badge, Button, Card, Input, Notice, Select, Section } from "@/components/ui";
import type { PickableItem } from "./MenuPicker";

export type MyGuestMeal = {
  id: string;
  quantity: number;
  guest_label: string | null;
  unit_price_bdt: number;
  items: { name: string; name_bn: string | null } | null;
};

export function GuestMeals({
  menuId,
  items,
  mine,
  open,
  officeCount,
}: {
  menuId: string;
  items: PickableItem[];
  mine: MyGuestMeal[];
  open: boolean;
  officeCount: number;
}) {
  const { t, f, n, dish, lang } = useI18n();
  const errorText = useErrorText();
  const [adding, setAdding] = useState(false);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const myTotal = mine.reduce((sum, g) => sum + g.quantity * g.unit_price_bdt, 0);

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await addGuestMeal(menuId, itemId, Number(quantity), label);
      if (result.error) return setError(errorText(result.error));
      setAdding(false);
      setLabel("");
      setQuantity("1");
    });
  }

  function remove(id: string) {
    setError("");
    startTransition(async () => {
      const result = await removeGuestMeal(id);
      if (result.error) setError(errorText(result.error));
    });
  }

  return (
    <Section
      title={t.guests.title}
      description={open ? t.guests.body : t.guests.closedNote}
      aside={
        officeCount > 0 ? (
          <Badge tone="brand">
            {officeCount === 1
              ? t.guests.officeOne
              : f(t.guests.officeToday, { count: officeCount })}
          </Badge>
        ) : undefined
      }
    >
      {error && (
        <div className="mb-3">
          <Notice>{error}</Notice>
        </div>
      )}

      {mine.length > 0 && (
        <Card className="mb-3" padded={false}>
          <ul className="divide-y divide-line">
            {mine.map((guest) => (
              <li
                key={guest.id}
                className="flex flex-col items-stretch gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {guest.items ? dish(guest.items) : "—"}
                    {guest.quantity > 1 && (
                      <span className="text-muted"> × {n(guest.quantity)}</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {guest.guest_label ? `${guest.guest_label} · ` : ""}
                    {formatMoney(guest.quantity * guest.unit_price_bdt, lang)}
                  </p>
                </div>
                {open && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="sm:shrink-0"
                    disabled={pending}
                    onClick={() => remove(guest.id)}
                  >
                    {t.guests.remove}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-5">
            <span className="text-sm text-muted">{t.money.guestMeals}</span>
            <span className="text-sm font-semibold tabular-nums">
              {formatMoney(myTotal, lang)}
            </span>
          </div>
        </Card>
      )}

      {!open ? null : adding ? (
        <Card>
          <div className="space-y-3">
            <Select
              label={t.guests.dish}
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {dish(item)}
                </option>
              ))}
            </Select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label={t.guests.howMany}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              >
                {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((value) => (
                  <option key={value} value={value}>
                    {n(Number(value))}
                  </option>
                ))}
              </Select>
              <Input
                label={t.guests.nameOptional}
                value={label}
                maxLength={60}
                placeholder={t.guests.namePlaceholder}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none"
                disabled={pending}
                onClick={() => {
                  setError("");
                  setAdding(false);
                }}
              >
                {t.common.cancel}
              </Button>
              <Button className="flex-1 sm:flex-none" disabled={pending || !itemId} onClick={submit}>
                {pending ? t.common.saving : t.guests.save}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button variant="secondary" block onClick={() => setAdding(true)}>
          {mine.length > 0 ? t.guests.addAnother : t.guests.add}
        </Button>
      )}
    </Section>
  );
}
