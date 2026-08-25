"use client";

import { useState, useTransition } from "react";
import { ensureMenu } from "./actions";
import { Button, Notice } from "@/components/ui";

export function StartDayButton({ menuDate }: { menuDate: string }) {
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
            if (result.error) setError(result.error);
          })
        }
      >
        {pending ? "Starting…" : "Start today's menu"}
      </Button>
    </div>
  );
}
