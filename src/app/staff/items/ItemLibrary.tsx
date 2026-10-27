"use client";

import { useState, useTransition } from "react";
import { createLibraryItem, setItemActive } from "../actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Badge, Button, Empty, Input, List, Notice, Row } from "@/components/ui";
import { Sheet } from "@/components/Sheet";

type Item = { id: string; name: string; name_bn: string | null; is_active: boolean };

export function ItemLibrary({ items }: { items: Item[] }) {
  const { t, dish } = useI18n();
  const errorText = useErrorText();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: Parameters<typeof errorText>[0] }>) {
    setError("");
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(errorText(result.error));
    });
  }

  return (
    <div className="space-y-5">
      {!adding && <Notice>{error}</Notice>}

      <Button block onClick={() => setAdding(true)}>
        + {t.staff.addDish}
      </Button>

      <Sheet
        open={adding}
        onClose={() => {
          setError("");
          setAdding(false);
        }}
        title={t.staff.addDish}
        footer={
          <>
            <Button
              variant="secondary"
              className="shrink-0 px-6"
              disabled={pending}
              onClick={() => {
                setError("");
                setAdding(false);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              className="flex-1"
              disabled={pending || name.trim().length < 2}
              onClick={() =>
                run(async () => {
                  const result = await createLibraryItem(name);
                  if (!result.error) {
                    setName("");
                    setAdding(false);
                  }
                  return result;
                })
              }
            >
              {pending ? t.common.saving : t.common.add}
            </Button>
          </>
        }
      >
        <Input
          value={name}
          placeholder={t.staff.dishPlaceholder}
          onChange={(e) => setName(e.target.value)}
        />
        {adding && <Notice>{error}</Notice>}
      </Sheet>

      {items.length === 0 ? (
        <Empty mood="sleepy">{t.prefs.emptyLibrary}</Empty>
      ) : (
        <List>
          {items.map((item) => (
            <Row key={item.id}>
              <span
                className={`min-w-0 flex-1 truncate text-[1.02rem] ${
                  item.is_active ? "font-medium" : "text-muted line-through"
                }`}
              >
                {dish(item)}
              </span>
              <div className="flex items-center gap-2">
                {!item.is_active && <Badge tone="bad">{t.staff.retired}</Badge>}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => setItemActive(item.id, !item.is_active))}
                >
                  {item.is_active ? t.staff.retire : t.staff.restore}
                </Button>
              </div>
            </Row>
          ))}
        </List>
      )}

      <p className="text-sm text-muted">{t.staff.retireNote}</p>
    </div>
  );
}
