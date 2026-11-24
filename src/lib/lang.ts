import "server-only";
import { cookies } from "next/headers";
import { getDict, type Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get("lang")?.value;
  return c === "en" ? "en" : "bn";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: getDict(lang) };
}
