// Server actions return codes, never prose — the UI is bilingual, so the
// wording has to be chosen on the client where the dictionary lives.
export type ErrorCode =
  | "invalid_name"
  | "invalid_phone"
  | "short_password"
  | "taken"
  | "create_failed"
  | "pick_failed"
  | "clear_failed"
  | "duplicate_dish"
  | "dish_name_too_short"
  | "session_expired"
  | "reset_refused"
  | "reset_expired"
  | "reset_locked"
  | "reset_failed"
  | "self_deactivate"
  | "generic";

export type ActionResult = { error?: ErrorCode; orphaned?: number };
