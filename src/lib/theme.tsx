import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

export type AccentPreset = {
  id: string;
  labelAr: string;
  labelEn: string;
  swatch: string;
  light: { accent: string; accentFg: string; primary: string; primaryFg: string };
  dark: { accent: string; accentFg: string; primary: string; primaryFg: string };
};

export const ACCENTS: AccentPreset[] = [
  {
    id: "amber",
    labelAr: "كهرماني",
    labelEn: "Amber",
    swatch: "oklch(0.76 0.15 68)",
    light: { accent: "oklch(0.76 0.15 68)", accentFg: "oklch(0.24 0.05 60)", primary: "oklch(0.36 0.09 245)", primaryFg: "oklch(0.98 0.01 95)" },
    dark: { accent: "oklch(0.78 0.15 68)", accentFg: "oklch(0.22 0.04 60)", primary: "oklch(0.78 0.15 68)", primaryFg: "oklch(0.22 0.04 60)" },
  },
  {
    id: "ocean",
    labelAr: "أزرق محيطي",
    labelEn: "Ocean",
    swatch: "oklch(0.62 0.14 240)",
    light: { accent: "oklch(0.62 0.14 240)", accentFg: "oklch(0.98 0.01 240)", primary: "oklch(0.42 0.13 245)", primaryFg: "oklch(0.98 0.01 240)" },
    dark: { accent: "oklch(0.72 0.14 240)", accentFg: "oklch(0.18 0.03 245)", primary: "oklch(0.72 0.14 240)", primaryFg: "oklch(0.18 0.03 245)" },
  },
  {
    id: "emerald",
    labelAr: "زمردي",
    labelEn: "Emerald",
    swatch: "oklch(0.62 0.13 163)",
    light: { accent: "oklch(0.62 0.13 163)", accentFg: "oklch(0.98 0.01 160)", primary: "oklch(0.4 0.1 165)", primaryFg: "oklch(0.98 0.01 160)" },
    dark: { accent: "oklch(0.74 0.13 163)", accentFg: "oklch(0.18 0.03 165)", primary: "oklch(0.74 0.13 163)", primaryFg: "oklch(0.18 0.03 165)" },
  },
  {
    id: "rose",
    labelAr: "وردي",
    labelEn: "Rose",
    swatch: "oklch(0.65 0.19 15)",
    light: { accent: "oklch(0.65 0.19 15)", accentFg: "oklch(0.98 0.01 15)", primary: "oklch(0.45 0.16 15)", primaryFg: "oklch(0.98 0.01 15)" },
    dark: { accent: "oklch(0.72 0.18 15)", accentFg: "oklch(0.18 0.04 15)", primary: "oklch(0.72 0.18 15)", primaryFg: "oklch(0.18 0.04 15)" },
  },
  {
    id: "violet",
    labelAr: "بنفسجي",
    labelEn: "Violet",
    swatch: "oklch(0.62 0.18 300)",
    light: { accent: "oklch(0.62 0.18 300)", accentFg: "oklch(0.98 0.01 300)", primary: "oklch(0.44 0.16 300)", primaryFg: "oklch(0.98 0.01 300)" },
    dark: { accent: "oklch(0.72 0.17 300)", accentFg: "oklch(0.18 0.04 300)", primary: "oklch(0.72 0.17 300)", primaryFg: "oklch(0.18 0.04 300)" },
  },
  {
    id: "teal",
    labelAr: "فيروزي",
    labelEn: "Teal",
    swatch: "oklch(0.66 0.12 200)",
    light: { accent: "oklch(0.66 0.12 200)", accentFg: "oklch(0.98 0.01 200)", primary: "oklch(0.42 0.1 205)", primaryFg: "oklch(0.98 0.01 200)" },
    dark: { accent: "oklch(0.75 0.12 200)", accentFg: "oklch(0.18 0.03 205)", primary: "oklch(0.75 0.12 200)", primaryFg: "oklch(0.18 0.03 205)" },
  },
];

type Ctx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  resolved: "light" | "dark";
  accent: string;
  setAccent: (id: string) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function applyAccent(id: string, resolved: "light" | "dark") {
  const preset = ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]!;
  const v = resolved === "dark" ? preset.dark : preset.light;
  const root = document.documentElement.style;
  root.setProperty("--accent", v.accent);
  root.setProperty("--accent-foreground", v.accentFg);
  root.setProperty("--primary", v.primary);
  root.setProperty("--primary-foreground", v.primaryFg);
  root.setProperty("--ring", v.accent);
  root.setProperty("--sidebar-primary", v.accent);
  root.setProperty("--sidebar-primary-foreground", v.accentFg);
  root.setProperty("--sidebar-ring", v.accent);
  root.setProperty("--chart-2", v.accent);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [accent, setAccentState] = useState<string>("amber");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const storedMode = window.localStorage.getItem("theme") as ThemeMode | null;
    const storedAccent = window.localStorage.getItem("accent");
    if (storedMode === "light" || storedMode === "dark" || storedMode === "system") setModeState(storedMode);
    if (storedAccent) setAccentState(storedAccent);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
    applyAccent(accent, resolved);
  }, [resolved, accent]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    window.localStorage.setItem("theme", m);
  }, []);

  const setAccent = useCallback((id: string) => {
    setAccentState(id);
    window.localStorage.setItem("accent", id);
  }, []);

  const value = useMemo(() => ({ mode, setMode, resolved, accent, setAccent }), [mode, setMode, resolved, accent, setAccent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
