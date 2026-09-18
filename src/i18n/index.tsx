import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { de, type Dictionary } from "./locales/de";
import { en } from "./locales/en";

export type Locale = "de" | "en";

const dictionaries: Record<Locale, Dictionary> = { de, en };
const STORAGE_KEY = "synapse.locale";

function detectDefaultLocale(): Locale {
  if (typeof window === "undefined") return "de";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "de" || saved === "en") return saved;
  } catch {}
  const nav = typeof navigator !== "undefined" ? navigator.language?.toLowerCase() : "";
  return nav.startsWith("en") ? "en" : "de";
}

function lookup(dict: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? `{{${name}}}`));
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectDefaultLocale());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const primary = lookup(dictionaries[locale], key);
      const value = typeof primary === "string" ? primary : (typeof lookup(dictionaries.de, key) === "string" ? (lookup(dictionaries.de, key) as string) : key);
      return interpolate(value, vars);
    },
    [locale],
  );

  const tArray = useCallback(
    (key: string) => {
      const primary = lookup(dictionaries[locale], key);
      if (Array.isArray(primary)) return primary as string[];
      const fallback = lookup(dictionaries.de, key);
      return Array.isArray(fallback) ? (fallback as string[]) : [];
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t, tArray }), [locale, setLocale, t, tArray]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  // Fallback for tests / stories that render without LocaleProvider.
  const t = (key: string, vars?: Record<string, string | number>) => {
    const value = lookup(dictionaries.de, key);
    return typeof value === "string" ? interpolate(value, vars) : key;
  };
  const tArray = (key: string) => {
    const value = lookup(dictionaries.de, key);
    return Array.isArray(value) ? (value as string[]) : [];
  };
  return { locale: "de" as Locale, setLocale: () => {}, t, tArray };
}

export function useT() {
  return useLocale().t;
}

export { dictionaries };