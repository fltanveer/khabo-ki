"use client";

import { useState, useTransition } from "react";
import { approveUser, createUser, deleteUser, setUserStatus } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Badge, Button, Card, Empty, Input, List, Notice, Row, Section, Select } from "@/components/ui";
import type { Profile, Status } from "@/lib/types";

const TONE: Record<Status, "warn" | "good" | "bad"> = {
  pending: "warn",
  active: "good",
  inactive: "bad",
};

export function PeopleManager({ people, selfId }: { people: Profile[]; selfId: string }) {
  const { t, f, n } = useI18n();
  const errorText = useErrorText();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  // Delete asks once, inline. A browser confirm() is easy to fat-finger past
  // on a phone, and this is the one action here that can't be undone.
  const [confirming, setConfirming] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    role: "staff" as "staff" | "admin",
  });
  const [pending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ error?: Parameters<typeof errorText>[0]; created?: boolean }>,
    onDone?: () => void,
  ) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(errorText(result.error));
        return;
      }
      onDone?.();
    });
  }

  function personRow(person: Profile) {
    const isSelf = person.id === selfId;
    const isConfirming = confirming === person.id;

    return (
      <Row key={person.id} className="flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {person.name}
              {isSelf && <span className="text-muted"> ({t.admin.you})</span>}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {person.phone} · {t.roles[person.role]}
            </p>
          </div>
          {/* Status rides with the name on a phone; the buttons get their own row. */}
          <Badge tone={TONE[person.status]}>{t.status[person.status]}</Badge>
        </div>

        {isConfirming ? (
          <div className="sm:shrink-0">
            <p className="mb-2 text-xs leading-relaxed text-bad sm:text-right">
              {f(t.admin.deleteConfirm, { name: person.name })}
            </p>
            <div className="flex gap-2 sm:justify-end">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={pending}
                onClick={() => setConfirming(null)}
              >
                {t.common.cancel}
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={pending}
                onClick={() =>
                  run(
                    () => deleteUser(person.id),
                    () => {
                      setConfirming(null);
                      setMessage(f(t.admin.deleted, { name: person.name }));
                    },
                  )
                }
              >
                {t.admin.deleteYes}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 sm:shrink-0">
            {person.status === "pending" && (
              <Button
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={pending}
                onClick={() => run(() => approveUser(person.id))}
              >
                {t.admin.approve}
              </Button>
            )}
            {person.status === "active" && !isSelf && (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={pending}
                onClick={() => run(() => setUserStatus(person.id, "inactive"))}
              >
                {t.admin.deactivate}
              </Button>
            )}
            {person.status === "inactive" && (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={pending}
                onClick={() => run(() => setUserStatus(person.id, "active"))}
              >
                {t.admin.activate}
              </Button>
            )}
            {!isSelf && (
              <Button
                variant="danger"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={pending}
                onClick={() => {
                  setError("");
                  setMessage("");
                  setConfirming(person.id);
                }}
              >
                {t.admin.delete}
              </Button>
            )}
          </div>
        )}
      </Row>
    );
  }

  const waiting = people.filter((p) => p.status === "pending");
  const rest = people.filter((p) => p.status !== "pending");

  return (
    <div>
      <div className="mb-4 space-y-2">
        <Notice>{error}</Notice>
        <Notice tone="good">{message}</Notice>
      </div>

      <Section
        title={t.admin.waiting}
        aside={waiting.length > 0 ? <Badge tone="warn">{n(waiting.length)}</Badge> : undefined}
      >
        {waiting.length === 0 ? (
          <Empty>{t.admin.nobodyWaiting}</Empty>
        ) : (
          <List>{waiting.map(personRow)}</List>
        )}
      </Section>

      <Section title={t.admin.everyoneElse} aside={<Badge>{n(rest.length)}</Badge>}>
        <List>{rest.map(personRow)}</List>
      </Section>

      <Section title={t.admin.createTitle} description={t.admin.createBody}>
        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t.auth.fullName}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label={t.auth.phone}
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label={t.admin.tempPassword}
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Select
              label={t.admin.role}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "staff" | "admin" })}
            >
              <option value="staff">{t.roles.staff}</option>
              <option value="admin">{t.roles.admin}</option>
            </Select>
          </div>
          <Button
            className="mt-4 w-full sm:w-auto"
            disabled={pending}
            onClick={() =>
              run(
                () => createUser(form.name, form.phone, form.password, form.role),
                () => {
                  setMessage(
                    f(t.admin.created, {
                      role: form.role === "admin" ? t.roles.admin : t.roles.staff,
                    }),
                  );
                  setForm({ name: "", phone: "", password: "", role: form.role });
                },
              )
            }
          >
            {t.auth.createAccount}
          </Button>
        </Card>
      </Section>
    </div>
  );
}
