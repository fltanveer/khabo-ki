"use client";

import { useState, useTransition } from "react";
import { createLibraryItem, setItemActive } from "../actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Badge, Button, Card, Empty, Input, List, Notice, Row } from "@/components/ui";

type Item = { id: string; name: string; name_bn: string | null; is_active: boolean };

export function ItemLibrary({ items }: { items: Item[] }) {
  const { t, dish } = useI18n();
  const errorText = useErrorText();
  const [name, setName] = useState("");
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
      <Notice>{error}</Notice>

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label={t.staff.addDish}
              value={name}
              placeholder={t.staff.dishPlaceholder}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            disabled={pending || name.trim().length < 2}
            onClick={() =>
              run(async () => {
                const result = await createLibraryItem(name);
                if (!result.error) setName("");
                return result;
              })
            }
          >
            {t.common.add}
          </Button>
        </div>
      </Card>

      {items.length === 0 ? (
        <Empty>{t.prefs.emptyLibrary}</Empty>
      ) : (
        <List>
          {items.map((item) => (
            <Row key={item.id}>
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
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
