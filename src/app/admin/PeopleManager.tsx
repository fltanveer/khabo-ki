"use client";

import { useState, useTransition } from "react";
import { approveUser, createUser, setUserStatus } from "./actions";
import { Badge, Button, Card, Empty, Input, Notice, Select } from "@/components/ui";
import type { Profile } from "@/lib/types";

const TONE = { pending: "warn", active: "good", inactive: "bad" } as const;

function PersonRow({
  person,
  pending,
  onApprove,
  onStatus,
  selfId,
}: {
  person: Profile;
  pending: boolean;
  onApprove: (id: string) => void;
  onStatus: (id: string, status: "active" | "inactive") => void;
  selfId: string;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div>
        <p className="text-sm font-medium">
          {person.name}
          {person.id === selfId && <span className="text-muted"> (you)</span>}
        </p>
        <p className="text-xs text-muted">
          {person.phone} · {person.role}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone={TONE[person.status]}>{person.status}</Badge>
        {person.status === "pending" && (
          <Button disabled={pending} onClick={() => onApprove(person.id)}>
            Approve
          </Button>
        )}
        {person.status === "active" && person.id !== selfId && (
          <Button variant="danger" disabled={pending} onClick={() => onStatus(person.id, "inactive")}>
            Deactivate
          </Button>
        )}
        {person.status === "inactive" && (
          <Button variant="secondary" disabled={pending} onClick={() => onStatus(person.id, "active")}>
            Reactivate
          </Button>
        )}
      </div>
    </li>
  );
}

export function PeopleManager({ people, selfId }: { people: Profile[]; selfId: string }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", password: "", role: "staff" as "staff" | "admin" });
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string; message?: string }>) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      if (result.message) setMessage(result.message);
    });
  }

  const waiting = people.filter((p) => p.status === "pending");
  const rest = people.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-8">
      <Notice>{error}</Notice>
      <Notice tone="good">{message}</Notice>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Waiting for approval <span className="text-muted">({waiting.length})</span>
        </h2>
        {waiting.length === 0 ? (
          <Empty>Nobody waiting.</Empty>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {waiting.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  pending={pending}
                  selfId={selfId}
                  onApprove={(id) => run(() => approveUser(id))}
                  onStatus={(id, status) => run(() => setUserStatus(id, status))}
                />
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Everyone else</h2>
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {rest.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                pending={pending}
                selfId={selfId}
                onApprove={(id) => run(() => approveUser(id))}
                onStatus={(id, status) => run(() => setUserStatus(id, status))}
              />
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Create a staff or admin account</h2>
        <p className="mb-3 text-sm text-muted">
          Employees register themselves. Staff and admin accounts are made here and are active
          straight away.
        </p>
        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Phone number"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Temporary password"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "staff" | "admin" })}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <Button
            className="mt-4"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await createUser(form.name, form.phone, form.password, form.role);
                if (!result.error) setForm({ name: "", phone: "", password: "", role: form.role });
                return result;
              })
            }
          >
            Create account
          </Button>
        </Card>
      </section>
    </div>
  );
}
