import { createContext, useContext, useState, type ReactNode } from "react";
import { defaultLLMConfig, type LLMConfig } from "../api/client";

interface LLMCtx {
  llm: LLMConfig;
  setLLM: (cfg: Partial<LLMConfig>) => void;
}

const Ctx = createContext<LLMCtx | null>(null);

const STORAGE_KEY = "sga_llm_config_v2";

function load(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // never persist the api key to localStorage for safety — keep in memory only per session
      return { ...defaultLLMConfig, ...parsed, api_key: "" };
    }
  } catch {
    /* ignore */
  }
  return defaultLLMConfig;
}

export function LLMProvider({ children }: { children: ReactNode }) {
  const [llm, setLLMState] = useState<LLMConfig>(load());

  const setLLM = (cfg: Partial<LLMConfig>) => {
    setLLMState((prev) => {
      const next = { ...prev, ...cfg };
      const { api_key, ...rest } = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
      return next;
    });
  };

  return <Ctx.Provider value={{ llm, setLLM }}>{children}</Ctx.Provider>;
}

export function useLLM() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLLM must be used within LLMProvider");
  return ctx;
}
