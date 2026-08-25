import { cookies } from "next/headers";
import { getDictionary, isLang, LANG_COOKIE, type Lang, type Dictionary } from "./index";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "en";
}

export async function getI18n(): Promise<{ lang: Lang; t: Dictionary }> {
  const lang = await getLang();
  return { lang, t: getDictionary(lang) };
}
