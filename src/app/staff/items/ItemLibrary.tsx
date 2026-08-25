"use client";

import { useState, useTransition } from "react";
import { createLibraryItem, setItemActive } from "../actions";
import { Badge, Button, Card, Empty, Input, Notice } from "@/components/ui";

type Item = { id: string; name: string; is_active: boolean };

export function ItemLibrary({ items }: { items: Item[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string }>) {
    setError("");
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <Notice>{error}</Notice>

      <Card>
        <div className="flex items-end gap-2">
          <Input
            label="Add an item"
            value={name}
            placeholder="e.g. Chicken curry"
            onChange={(e) => setName(e.target.value)}
          />
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
            Add
          </Button>
        </div>
      </Card>

      {items.length === 0 ? (
        <Empty>The library is empty. Add the dishes the restaurant sends regularly.</Empty>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className={`text-sm ${item.is_active ? "" : "text-muted line-through"}`}>
                  {item.name}
                </span>
                <div className="flex items-center gap-3">
                  {!item.is_active && <Badge tone="bad">retired</Badge>}
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => setItemActive(item.id, !item.is_active))}
                  >
                    {item.is_active ? "Retire" : "Restore"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-sm text-muted">
        Retiring an item hides it from menu building without touching past orders.
      </p>
    </div>
  );
}
