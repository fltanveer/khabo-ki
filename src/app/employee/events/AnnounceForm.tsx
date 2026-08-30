"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { announceEvent } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Button, Card, Input, Notice, Section, Select } from "@/components/ui";

export function AnnounceForm({
  people,
  selfId,
}: {
  people: { id: string; name: string }[];
  selfId: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const errorText = useErrorText();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    details: "",
    eventAt: "",
    costMode: "treat" as "treat" | "shared",
    total: "",
    collectorId: selfId,
  });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await announceEvent({
        title: form.title,
        details: form.details,
        eventAt: form.eventAt,
        costMode: form.costMode,
        total: form.costMode === "shared" ? Number(form.total) : null,
        collectorId: form.collectorId,
      });
      if (result.error) return setError(errorText(result.error));
      setOpen(false);
      setForm({ ...form, title: "", details: "", eventAt: "", total: "" });
      if (result.id) router.push(`/employee/events/${result.id}`);
    });
  }

  if (!open) {
    return (
      <div className="mb-6">
        <Button block onClick={() => setOpen(true)}>
          {t.events.announce}
        </Button>
      </div>
    );
  }

  return (
    <Section title={t.events.announceTitle}>
      <Card>
        <div className="space-y-3">
          <Input
            label={t.events.eventTitle}
            value={form.title}
            maxLength={120}
            placeholder={t.events.titlePlaceholder}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t.events.details}</span>
            <textarea
              value={form.details}
              maxLength={2000}
              rows={3}
              placeholder={t.events.detailsPlaceholder}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              className="w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </label>

          <Input
            label={t.events.when}
            type="datetime-local"
            value={form.eventAt}
            onChange={(e) => setForm({ ...form, eventAt: e.target.value })}
          />

          <Select
            label={t.events.costMode}
            value={form.costMode}
            onChange={(e) =>
              setForm({ ...form, costMode: e.target.value as "treat" | "shared" })
            }
          >
            <option value="treat">{t.events.treat}</option>
            <option value="shared">{t.events.shared}</option>
          </Select>

          {form.costMode === "shared" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={t.events.total}
                inputMode="numeric"
                value={form.total}
                onChange={(e) =>
                  setForm({ ...form, total: e.target.value.replace(/[^\d]/g, "") })
                }
              />
              <Select
                label={t.events.collector}
                value={form.collectorId}
                onChange={(e) => setForm({ ...form, collectorId: e.target.value })}
              >
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <Notice>{error}</Notice>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1 sm:flex-none"
              disabled={pending}
              onClick={() => {
                setError("");
                setOpen(false);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button className="flex-1 sm:flex-none" disabled={pending} onClick={submit}>
              {pending ? t.events.posting : t.events.post}
            </Button>
          </div>
        </div>
      </Card>
    </Section>
  );
}
