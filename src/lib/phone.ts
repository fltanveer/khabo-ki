// Phone is the login identity. Supabase's phone provider needs an SMS gateway
// even with OTP disabled, so we map the number onto a synthetic email address
// and use the email/password provider instead. Nothing is ever sent to it.
export const PHONE_EMAIL_DOMAIN = "khaboki.local";

export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  return digits.length >= 6 && digits.length <= 15;
}

export function phoneToEmail(raw: string): string {
  return `${normalizePhone(raw)}@${PHONE_EMAIL_DOMAIN}`;
}
