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
      create_failed: t.auth.createFailed,
      network: t.auth.offline,
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
      self_delete: t.admin.cannotSelfDelete,
      delete_failed: t.admin.deleteFailed,
      owes_money: t.admin.owesMoney,
      guest_add_failed: t.guests.addFailed,
      guest_remove_failed: t.guests.removeFailed,
      event_failed: t.events.saveFailed,
      invalid_title: t.events.invalidTitle,
      invalid_date: t.events.invalidDate,
      invalid_total: t.events.invalidTotal,
      pay_failed: t.money.payFailed,
      amount_too_big: t.money.amountTooBig,
      invalid_amount: t.money.invalidAmount,
      no_admin: t.money.noAdmin,
      generic: t.employee.saveFailed,
    };
    return map[code] ?? t.employee.saveFailed;
  };
}
