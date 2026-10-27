"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { announceEvent } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Button, Input, Notice, Select } from "@/components/ui";
import { Sheet } from "@/components/Sheet";

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

  function close() {
    setError("");
    setOpen(false);
  }

  return (
    <div className="mb-7">
      <Button block onClick={() => setOpen(true)}>
        {t.events.announce}
      </Button>

      <Sheet
        open={open}
        onClose={close}
        title={t.events.announceTitle}
        footer={
          <>
            <Button variant="secondary" className="shrink-0 px-6" disabled={pending} onClick={close}>
              {t.common.cancel}
            </Button>
            <Button className="flex-1" disabled={pending} onClick={submit}>
              {pending ? t.events.posting : t.events.post}
            </Button>
          </>
        }
      >
        <Input
          label={t.events.eventTitle}
          value={form.title}
          maxLength={120}
          placeholder={t.events.titlePlaceholder}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-muted">{t.events.details}</span>
          <textarea
            value={form.details}
            maxLength={2000}
            rows={3}
            placeholder={t.events.detailsPlaceholder}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            className="w-full rounded-[1.125rem] border border-line-strong bg-surface px-4 py-3 text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-faint focus:border-ink focus:ring-4 focus:ring-ink/10"
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
          onChange={(e) => setForm({ ...form, costMode: e.target.value as "treat" | "shared" })}
        >
          <option value="treat">{t.events.treat}</option>
          <option value="shared">{t.events.shared}</option>
        </Select>

        {form.costMode === "shared" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t.events.total}
              inputMode="numeric"
              value={form.total}
              onChange={(e) => setForm({ ...form, total: e.target.value.replace(/[^\d]/g, "") })}
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
      </Sheet>
    </div>
  );
}
