"use client";
import { useTransition } from "react";
import { setLanguage } from "@/app/actions";

export function LangToggle({ lang }: { lang: "bn" | "en" }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="lang-toggle"
      disabled={pending}
      onClick={() => start(() => setLanguage(lang === "bn" ? "en" : "bn"))}
      aria-label="Switch language"
    >
      {lang === "bn" ? "English" : "বাংলা"}
    </button>
  );
}
