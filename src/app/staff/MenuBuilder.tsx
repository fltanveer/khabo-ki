"use client";

import { useState, useTransition } from "react";
import {
  addExistingItem,
  addNewItem,
  lockMenu,
  publishMenu,
  removeItem,
  setCutoff,
} from "./actions";
import { Badge, Button, Card, Input, Notice, Select } from "@/components/ui";

type Item = { id: string; name: string };

export function MenuBuilder({
  menuId,
  menuDate,
  cutoffHHMM,
  published,
  locked,
  closed,
  onMenu,
  library,
}: {
  menuId: string;
  menuDate: string;
  cutoffHHMM: string;
  published: boolean;
  locked: boolean;
  closed: boolean;
  onMenu: Item[];
  library: Item[];
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [pickId, setPickId] = useState("");
  const [cutoff, setCutoffValue] = useState(cutoffHHMM);
  const [pending, startTransition] = useTransition();

  const onMenuIds = new Set(onMenu.map((item) => item.id));
  const available = library.filter((item) => !onMenuIds.has(item.id));

  function run(fn: () => Promise<{ error?: string; message?: string }>) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      if (result.message) setMessage(result.message);
    });
  }

  return (
    <div className="space-y-5">
      <Notice>{error}</Notice>
      <Notice tone="good">{message}</Notice>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            On the menu{" "}
            <span className="text-muted">({onMenu.length})</span>
          </h2>
          {published ? (
            locked ? (
              <Badge tone="bad">Locked</Badge>
            ) : (
              <Badge tone="good">Published</Badge>
            )
          ) : (
            <Badge tone="warn">Draft — employees can&apos;t see this yet</Badge>
          )}
        </div>

        {onMenu.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing added yet. Add whatever the restaurant is bringing today.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {onMenu.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm">{item.name}</span>
                <Button
                  variant="danger"
                  disabled={pending || closed}
                  onClick={() => run(() => removeItem(menuId, item.id))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!closed && (
          <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
            <div className="flex items-end gap-2">
              <Select
                label="Add from library"
                value={pickId}
                onChange={(e) => setPickId(e.target.value)}
              >
                <option value="">Choose an item…</option>
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <Button
                disabled={pending || !pickId}
                onClick={() =>
                  run(async () => {
                    const result = await addExistingItem(menuId, pickId);
                    setPickId("");
                    return result;
                  })
                }
              >
                Add
              </Button>
            </div>

            <div className="flex items-end gap-2">
              <Input
                label="Or add something new"
                value={newName}
                placeholder="e.g. Beef tehari"
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button
                disabled={pending || newName.trim().length < 2}
                onClick={() =>
                  run(async () => {
                    const result = await addNewItem(menuId, newName);
                    if (!result.error) setNewName("");
                    return result;
                  })
                }
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Cutoff</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Ordering closes at"
            type="time"
            value={cutoff}
            disabled={closed}
            onChange={(e) => setCutoffValue(e.target.value)}
            className="w-40"
          />
          <Button
            variant="secondary"
            disabled={pending || closed || cutoff === cutoffHHMM}
            onClick={() => run(() => setCutoff(menuId, menuDate, cutoff))}
          >
            Save cutoff
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        {!published && (
          <Button
            disabled={pending || onMenu.length === 0}
            onClick={() => run(() => publishMenu(menuId))}
          >
            Publish to employees
          </Button>
        )}
        {published && !locked && (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => lockMenu(menuId))}>
            Close ordering now
          </Button>
        )}
      </div>
    </div>
  );
}
