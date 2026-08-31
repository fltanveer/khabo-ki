"use client";

import { useState, useTransition } from "react";
import { saveDisplayName } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Button, Card, Input, Notice } from "@/components/ui";

export function NameSettings({
  registeredName,
  displayName,
}: {
  registeredName: string;
  displayName: string | null;
}) {
  const { t, f } = useI18n();
  const errorText = useErrorText();
  const [value, setValue] = useState(displayName ?? "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const shown = value.trim().length > 0 ? value.trim() : registeredName;

  function save() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await saveDisplayName(value);
      if (result.error) return setError(errorText(result.error));
      setMessage(t.settings.nameSaved);
    });
  }

  return (
    <Card>
      <div className="space-y-4">
        <Input
          label={t.settings.shownAs}
          value={value}
          maxLength={60}
          placeholder={registeredName}
          hint={t.settings.nameHint}
          onChange={(e) => setValue(e.target.value)}
        />

        <p className="rounded-xl bg-raised px-3.5 py-2.5 text-sm">
          <span className="text-muted">{t.settings.preview} </span>
          <span className="font-medium">{shown}</span>
        </p>

        <p className="text-xs text-muted">
          {f(t.settings.registeredAs, { name: registeredName })}
        </p>

        <Notice>{error}</Notice>
        <Notice tone="good">{message}</Notice>

        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={save} className="w-full sm:w-auto">
            {pending ? t.common.saving : t.common.save}
          </Button>
          {displayName && value.trim().length > 0 && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setValue("");
                startTransition(async () => {
                  const result = await saveDisplayName("");
                  if (result.error) setError(errorText(result.error));
                  else setMessage(t.settings.nameSaved);
                });
              }}
            >
              {t.settings.useRegistered}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
