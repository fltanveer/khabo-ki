"use client";

import { useState, useTransition } from "react";
import { approveUser, createUser, deleteUser, setUserStatus } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Badge, Button, Empty, Input, List, Notice, Row, Section, Select } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { shownName } from "@/lib/names";
import type { Profile, Status } from "@/lib/types";

const TONE: Record<Status, "warn" | "good" | "bad"> = {
  pending: "warn",
  active: "good",
  inactive: "bad",
};

export function PeopleManager({
  people,
  selfId,
  children,
}: {
  people: Profile[];
  selfId: string;
  children?: React.ReactNode;
}) {
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
  const [creating, setCreating] = useState(false);
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

    return (
      <Row key={person.id} className="flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {shownName(person)}
              {isSelf && <span className="text-muted"> ({t.admin.you})</span>}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {person.phone} · {t.roles[person.role]}
              {person.display_name ? ` · ${person.name}` : ""}
            </p>
          </div>
          {/* Status rides with the name on a phone; the buttons get their own row. */}
          <div className="flex shrink-0 items-center gap-1.5">
            {person.is_test && <Badge tone="brand">{t.admin.testAccount}</Badge>}
            <Badge tone={TONE[person.status]}>{t.status[person.status]}</Badge>
          </div>
        </div>

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
      </Row>
    );
  }

  const waiting = people.filter((p) => p.status === "pending");
  const rest = people.filter((p) => p.status !== "pending");
  const activeCount = people.filter((p) => p.status === "active").length;
  const inactiveCount = people.filter((p) => p.status === "inactive").length;
  const toDelete = people.find((p) => p.id === confirming) ?? null;

  function closeCreate() {
    setError("");
    setCreating(false);
  }

  return (
    <div>
      <div className="mb-4 space-y-2">
        {!creating && !toDelete && <Notice>{error}</Notice>}
        <Notice tone="good">{message}</Notice>
      </div>

      {/* Who's in the office at a glance; the waiting count is the one that
          wants something from the admin, so it's the hero. */}
      <section className="mb-7 rounded-card bg-surface p-6 shadow-[var(--shadow-card)]">
        <p className="flex items-center gap-1.5 text-sm font-light italic text-muted">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${waiting.length > 0 ? "bg-warn" : "bg-good"}`}
          />
          {t.admin.waiting}
        </p>
        <p className="metric mt-3 text-[4.5rem]">{n(waiting.length)}</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {[
            { label: t.status.active, value: activeCount },
            { label: t.status.inactive, value: inactiveCount },
          ].map((figure) => (
            <div key={figure.label} className="rounded-inner bg-raised px-4 py-3">
              <p className="text-xs capitalize text-muted">{figure.label}</p>
              <p className="mt-1 text-[1.6rem] font-light leading-none tracking-[-0.02em] tabular-nums">
                {n(figure.value)}
              </p>
            </div>
          ))}
        </div>
        <Button block className="mt-5" onClick={() => setCreating(true)}>
          + {t.admin.createTitle}
        </Button>
      </section>

      {children}

      <Section
        title={t.admin.waiting}
        aside={waiting.length > 0 ? <Badge tone="warn">{n(waiting.length)}</Badge> : undefined}
      >
        {waiting.length === 0 ? (
          <Empty mood="happy">{t.admin.nobodyWaiting}</Empty>
        ) : (
          <List>{waiting.map(personRow)}</List>
        )}
      </Section>

      <Section title={t.admin.everyoneElse} aside={<Badge>{n(rest.length)}</Badge>}>
        <List>{rest.map(personRow)}</List>
      </Section>

      <Sheet
        open={toDelete !== null}
        onClose={() => {
          setError("");
          setConfirming(null);
        }}
        title={t.admin.delete}
        description={toDelete ? f(t.admin.deleteConfirm, { name: shownName(toDelete) }) : undefined}
        footer={
          <>
            <Button
              variant="secondary"
              className="shrink-0 px-6"
              disabled={pending}
              onClick={() => setConfirming(null)}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={pending || !toDelete}
              onClick={() => {
                if (!toDelete) return;
                const person = toDelete;
                run(
                  () => deleteUser(person.id),
                  () => {
                    setConfirming(null);
                    setMessage(f(t.admin.deleted, { name: shownName(person) }));
                  },
                );
              }}
            >
              {t.admin.deleteYes}
            </Button>
          </>
        }
      >
        {toDelete && <Notice>{error}</Notice>}
      </Sheet>

      <Sheet
        open={creating}
        onClose={closeCreate}
        title={t.admin.createTitle}
        description={t.admin.createBody}
        footer={
          <>
            <Button variant="secondary" className="shrink-0 px-6" disabled={pending} onClick={closeCreate}>
              {t.common.cancel}
            </Button>
            <Button
              className="flex-1"
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
                    setCreating(false);
                  },
                )
              }
            >
              {pending ? t.common.saving : t.auth.createAccount}
            </Button>
          </>
        }
      >
          <div className="grid gap-4 sm:grid-cols-2">
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
          {creating && <Notice>{error}</Notice>}
      </Sheet>
    </div>
  );
}
