"use client";

import { useState, useTransition } from "react";
import { approveReset, denyReset } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Badge, Button, Empty, List, Notice, Row, Section } from "@/components/ui";
import { formatTime } from "@/lib/date";
import type { PasswordReset } from "@/lib/types";

export function ResetRequests({ requests }: { requests: PasswordReset[] }) {
  const { t, f, n, lang } = useI18n();
  const errorText = useErrorText();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: Parameters<typeof errorText>[0] }>) {
    setError("");
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(errorText(result.error));
    });
  }

  return (
    <Section
      title={t.admin.resetsTitle}
      description={t.admin.resetsBody}
      aside={requests.length > 0 ? <Badge tone="warn">{n(requests.length)}</Badge> : undefined}
    >
      {error && (
        <div className="mb-3">
          <Notice>{error}</Notice>
        </div>
      )}

      {requests.length === 0 ? (
        <Empty>{t.admin.noResets}</Empty>
      ) : (
        <List>
          {requests.map((request) => (
            <Row
              key={request.id}
              className="flex-col items-stretch gap-2.5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {request.profile?.name ?? "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {request.profile?.phone}
                  {request.profile && ` · ${t.roles[request.profile.role]}`}
                </p>
                {request.status === "approved" && request.code && (
                  // Read this out to them in person. It is the only thing
                  // standing between the request and whoever else knows the
                  // number, so don't post it anywhere public.
                  <p className="mt-2 text-sm">
                    <span className="text-muted">{t.admin.resetCode} </span>
                    <span className="font-mono text-base font-semibold tracking-[0.25em] text-brand">
                      {request.code}
                    </span>
                  </p>
                )}
                {request.status === "approved" && (
                  <p className="mt-1 text-xs text-muted">
                    {f(t.admin.resetExpires, {
                      time: request.expires_at ? formatTime(request.expires_at, lang) : "—",
                    })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 sm:shrink-0">
                {request.status === "approved" && <Badge tone="good">{t.admin.resetApproved}</Badge>}
                <Button
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={pending}
                  onClick={() => run(() => approveReset(request.id))}
                >
                  {request.status === "approved" ? t.admin.resetNewCode : t.admin.approve}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={pending}
                  onClick={() => run(() => denyReset(request.id))}
                >
                  {t.admin.resetDeny}
                </Button>
              </div>
            </Row>
          ))}
        </List>
      )}
    </Section>
  );
}
