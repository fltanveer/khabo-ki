"use client";

import { useState, useTransition } from "react";
import { ensureMenu } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Button, Notice } from "@/components/ui";

export function StartDayButton({ menuDate }: { menuDate: string }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <Notice>{error}</Notice>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await ensureMenu(menuDate);
            if (result.error) setError(errorText(result.error));
          })
        }
      >
        {pending ? t.staff.starting : t.staff.startDay}
      </Button>
    </div>
  );
}
