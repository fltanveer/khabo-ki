"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { LANG_COOKIE, isLang } from "@/lib/i18n";

// Written server-side so the cookie is set the same way it's read, and the
// whole tree re-renders in the new language without a full reload.
export async function setLanguage(next: string) {
  if (!isLang(next)) return;

  const store = await cookies();
  store.set(LANG_COOKIE, next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
