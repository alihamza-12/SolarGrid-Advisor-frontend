import { createContext, useContext, useState, type ReactNode } from "react";
import { en } from "./en";
import { ur } from "./ur";

type Lang = "en" | "ur";
const dicts = { en, ur };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof en) => any;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("sga_lang") as Lang) || "en");

  const setLangPersist = (l: Lang) => {
    setLang(l);
    localStorage.setItem("sga_lang", l);
  };

  const t = (key: keyof typeof en) => dicts[lang][key] ?? dicts.en[key] ?? key;

  return <Ctx.Provider value={{ lang, setLang: setLangPersist, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
