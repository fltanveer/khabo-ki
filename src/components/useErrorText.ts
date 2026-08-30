"use client";

import type { ErrorCode } from "@/lib/errors";
import { useI18n } from "./I18nProvider";

export function useErrorText(): (code?: ErrorCode) => string {
  const { t } = useI18n();

  return (code) => {
    if (!code) return "";
    const map: Record<ErrorCode, string> = {
      invalid_name: t.auth.invalidName,
      invalid_phone: t.auth.invalidPhone,
      short_password: t.auth.shortPassword,
      taken: t.auth.phoneTaken,
      create_failed: t.auth.phoneTaken,
      pick_failed: t.employee.saveFailed,
      clear_failed: t.employee.clearFailed,
      duplicate_dish: t.staff.duplicate,
      dish_name_too_short: t.staff.nameTooShort,
      session_expired: t.admin.sessionExpired,
      reset_refused: t.reset.refused,
      reset_expired: t.reset.expired,
      reset_locked: t.reset.locked,
      reset_failed: t.reset.failed,
      self_deactivate: t.admin.cannotSelfDeactivate,
      generic: t.employee.saveFailed,
    };
    return map[code] ?? t.employee.saveFailed;
  };
}
