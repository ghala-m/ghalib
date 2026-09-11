import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

export type AccentPreset = {
  id: string;
  labelAr: string;
  labelEn: string;
  swatch: string;
  light: { accent: string; accentFg: string; primary: string; primaryFg: string };
  dark: { accent: string; accentFg: string; primary: string; primaryFg: string };
  /** Full "colour combination" presets (background matches the accent, not just the buttons) —
   * a hue (0-360) applied to every background-family token (page bg, cards, sidebar, muted,
   * borders), keeping each token's existing lightness/chroma so contrast stays exactly as
   * tested today and only the hue shifts. Omitted for the plain accent-only presets, which
   * keep this app's default navy background untouched. */
  bgHue?: number;
};

export const ACCENTS: AccentPreset[] = [
  {
    id: "amber",
    labelAr: "كهرماني",
    labelEn: "Amber",
    swatch: "oklch(0.76 0.15 68)",
    light: {
      accent: "oklch(0.76 0.15 68)",
      accentFg: "oklch(0.24 0.05 60)",
      primary: "oklch(0.36 0.09 245)",
      primaryFg: "oklch(0.98 0.01 95)",
    },
    dark: {
      accent: "oklch(0.78 0.15 68)",
      accentFg: "oklch(0.22 0.04 60)",
      primary: "oklch(0.78 0.15 68)",
      primaryFg: "oklch(0.22 0.04 60)",
    },
  },
  {
    id: "ocean",
    labelAr: "أزرق محيطي",
    labelEn: "Ocean",
    swatch: "oklch(0.62 0.14 240)",
    light: {
      accent: "oklch(0.62 0.14 240)",
      accentFg: "oklch(0.98 0.01 240)",
      primary: "oklch(0.42 0.13 245)",
      primaryFg: "oklch(0.98 0.01 240)",
    },
    dark: {
      accent: "oklch(0.72 0.14 240)",
      accentFg: "oklch(0.18 0.03 245)",
      primary: "oklch(0.72 0.14 240)",
      primaryFg: "oklch(0.18 0.03 245)",
    },
  },
  {
    id: "emerald",
    labelAr: "زمردي",
    labelEn: "Emerald",
    swatch: "oklch(0.62 0.13 163)",
    light: {
      accent: "oklch(0.62 0.13 163)",
      accentFg: "oklch(0.98 0.01 160)",
      primary: "oklch(0.4 0.1 165)",
      primaryFg: "oklch(0.98 0.01 160)",
    },
    dark: {
      accent: "oklch(0.74 0.13 163)",
      accentFg: "oklch(0.18 0.03 165)",
      primary: "oklch(0.74 0.13 163)",
      primaryFg: "oklch(0.18 0.03 165)",
    },
  },
  {
    id: "rose",
    labelAr: "وردي",
    labelEn: "Rose",
    swatch: "oklch(0.65 0.19 15)",
    light: {
      accent: "oklch(0.65 0.19 15)",
      accentFg: "oklch(0.98 0.01 15)",
      primary: "oklch(0.45 0.16 15)",
      primaryFg: "oklch(0.98 0.01 15)",
    },
    dark: {
      accent: "oklch(0.72 0.18 15)",
      accentFg: "oklch(0.18 0.04 15)",
      primary: "oklch(0.72 0.18 15)",
      primaryFg: "oklch(0.18 0.04 15)",
    },
  },
  {
    id: "violet",
    labelAr: "بنفسجي",
    labelEn: "Violet",
    swatch: "oklch(0.62 0.18 300)",
    light: {
      accent: "oklch(0.62 0.18 300)",
      accentFg: "oklch(0.98 0.01 300)",
      primary: "oklch(0.44 0.16 300)",
      primaryFg: "oklch(0.98 0.01 300)",
    },
    dark: {
      accent: "oklch(0.72 0.17 300)",
      accentFg: "oklch(0.18 0.04 300)",
      primary: "oklch(0.72 0.17 300)",
      primaryFg: "oklch(0.18 0.04 300)",
    },
  },
  {
    id: "teal",
    labelAr: "فيروزي",
    labelEn: "Teal",
    swatch: "oklch(0.66 0.12 200)",
    light: {
      accent: "oklch(0.66 0.12 200)",
      accentFg: "oklch(0.98 0.01 200)",
      primary: "oklch(0.42 0.1 205)",
      primaryFg: "oklch(0.98 0.01 200)",
    },
    dark: {
      accent: "oklch(0.75 0.12 200)",
      accentFg: "oklch(0.18 0.03 205)",
      primary: "oklch(0.75 0.12 200)",
      primaryFg: "oklch(0.18 0.03 205)",
    },
  },
  {
    // "Raspberry & Lemon": the whole background shifts to a deep raspberry tone, with pale
    // lemon as the accent/button colour — matching the reference exactly rather than just
    // recolouring buttons on the usual navy background.
    id: "raspberry",
    labelAr: "توت العليق وليمون",
    labelEn: "Raspberry & Lemon",
    swatch: "oklch(0.4 0.15 10)",
    bgHue: 10,
    light: {
      accent: "oklch(0.92 0.06 95)",
      accentFg: "oklch(0.35 0.15 10)",
      primary: "oklch(0.4 0.15 10)",
      primaryFg: "oklch(0.95 0.04 95)",
    },
    dark: {
      accent: "oklch(0.92 0.06 95)",
      accentFg: "oklch(0.3 0.14 10)",
      primary: "oklch(0.92 0.06 95)",
      primaryFg: "oklch(0.3 0.14 10)",
    },
  },
  {
    // "Citron & Tyrian Purple": background shifts to a deep purple, citron stays the accent.
    id: "citron",
    labelAr: "ليموني وبنفسجي",
    labelEn: "Citron & Tyrian Purple",
    swatch: "oklch(0.85 0.13 115)",
    bgHue: 330,
    light: {
      accent: "oklch(0.8 0.14 115)",
      accentFg: "oklch(0.25 0.08 330)",
      primary: "oklch(0.32 0.1 330)",
      primaryFg: "oklch(0.95 0.03 115)",
    },
    dark: {
      accent: "oklch(0.85 0.13 115)",
      accentFg: "oklch(0.22 0.07 330)",
      primary: "oklch(0.85 0.13 115)",
      primaryFg: "oklch(0.22 0.07 330)",
    },
  },
  {
    // "Blue, Butter & Chocopie": background shifts to a warm chocolate brown, butter yellow is
    // the accent, and the cool powder blue becomes the secondary/primary colour.
    id: "chocopie",
    labelAr: "شوكوبايْ وزبدي",
    labelEn: "Chocopie & Butter",
    swatch: "oklch(0.3 0.05 45)",
    bgHue: 45,
    light: {
      accent: "oklch(0.9 0.07 95)",
      accentFg: "oklch(0.3 0.05 45)",
      primary: "oklch(0.78 0.05 230)",
      primaryFg: "oklch(0.25 0.04 45)",
    },
    dark: {
      accent: "oklch(0.9 0.07 95)",
      accentFg: "oklch(0.28 0.05 45)",
      primary: "oklch(0.78 0.05 230)",
      primaryFg: "oklch(0.25 0.04 45)",
    },
  },
];

/**
 * sRGB hex -> OKLCH hue (degrees), using Björn Ottosson's OKLab reference conversion. Used to
 * let a fully custom background colour (picked as a hex swatch) re-hue the same background
 * tokens `applyBgTint` uses for the (now-removed) built-in "combo" presets — so "pick your own
 * background + accent" reuses the exact same, already-safe (lightness/chroma preserving)
 * mechanism instead of a new one.
 */
function hexToOklchHue(hex: string): number {
  const clean = hex.replace("#", "");
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = toLinear(parseInt(clean.slice(0, 2), 16) / 255);
  const g = toLinear(parseInt(clean.slice(2, 4), 16) / 255);
  const b = toLinear(parseInt(clean.slice(4, 6), 16) / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const hue = (Math.atan2(bb, a) * 180) / Math.PI;
  return hue < 0 ? hue + 360 : hue;
}

type Ctx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  resolved: "light" | "dark";
  accent: string;
  setAccent: (id: string) => void;
  /** Fully custom background hue (as a hex swatch) independent of the accent — see
   * `applyBgTint`. Null means "no custom background, use whatever the accent preset implies". */
  customBg: string | null;
  setCustomBg: (hex: string | null) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

/** Relative luminance of a #rrggbb colour, used to pick readable foreground text. */
function hexLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function isCustomAccent(id: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(id);
}

const BG_TOKENS_DARK: Record<string, [l: number, c: number]> = {
  "--background": [0.19, 0.03],
  "--card": [0.235, 0.035],
  "--popover": [0.235, 0.035],
  "--muted": [0.28, 0.035],
  "--secondary": [0.3, 0.04],
  "--sidebar": [0.165, 0.03],
  "--sidebar-accent": [0.26, 0.035],
};
const BG_TOKENS_LIGHT: Record<string, [l: number, c: number]> = {
  "--background": [0.985, 0.006],
  "--muted": [0.955, 0.008],
  "--border": [0.9, 0.012],
  "--sidebar": [0.24, 0.04],
  "--sidebar-accent": [0.3, 0.045],
  "--sidebar-border": [0.33, 0.04],
};

/** Re-hues every background-family token toward `hue`, keeping each one's existing
 * lightness/chroma so contrast is unaffected — see AccentPreset.bgHue. */
function applyBgTint(hue: number, resolved: "light" | "dark") {
  const root = document.documentElement.style;
  const tokens = resolved === "dark" ? BG_TOKENS_DARK : BG_TOKENS_LIGHT;
  for (const [prop, [l, c]] of Object.entries(tokens)) {
    root.setProperty(prop, `oklch(${l} ${c} ${hue})`);
  }
}

function clearBgTint() {
  const root = document.documentElement.style;
  for (const prop of new Set([...Object.keys(BG_TOKENS_DARK), ...Object.keys(BG_TOKENS_LIGHT)])) {
    root.removeProperty(prop);
  }
}

function applyAccent(id: string, resolved: "light" | "dark") {
  const root = document.documentElement.style;
  if (isCustomAccent(id)) {
    clearBgTint();
    const fg = hexLuminance(id) > 0.5 ? "oklch(0.2 0.02 260)" : "oklch(0.98 0.005 260)";
    for (const [prop, val] of [
      ["--accent", id],
      ["--accent-foreground", fg],
      ["--primary", id],
      ["--primary-foreground", fg],
      ["--ring", id],
      ["--sidebar-primary", id],
      ["--sidebar-primary-foreground", fg],
      ["--sidebar-ring", id],
      ["--chart-2", id],
    ] as const) {
      root.setProperty(prop, val);
    }
    return;
  }
  const preset = ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]!;
  if (preset.bgHue != null) applyBgTint(preset.bgHue, resolved);
  else clearBgTint();
  const v = resolved === "dark" ? preset.dark : preset.light;
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
  const [customBg, setCustomBgState] = useState<string | null>(null);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const storedMode = window.localStorage.getItem("theme") as ThemeMode | null;
    const storedAccent = window.localStorage.getItem("accent");
    const storedBg = window.localStorage.getItem("customBg");
    if (storedMode === "light" || storedMode === "dark" || storedMode === "system")
      setModeState(storedMode);
    if (storedAccent) setAccentState(storedAccent);
    if (storedBg) setCustomBgState(storedBg);
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
    // A custom background is independent of which accent/preset is active — applied last so it
    // always wins over whatever background a preset (or clearing one) just set.
    if (customBg) applyBgTint(hexToOklchHue(customBg), resolved);
  }, [resolved, accent, customBg]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    window.localStorage.setItem("theme", m);
  }, []);

  const setAccent = useCallback((id: string) => {
    setAccentState(id);
    window.localStorage.setItem("accent", id);
  }, []);

  const setCustomBg = useCallback((hex: string | null) => {
    setCustomBgState(hex);
    if (hex) window.localStorage.setItem("customBg", hex);
    else window.localStorage.removeItem("customBg");
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, resolved, accent, setAccent, customBg, setCustomBg }),
    [mode, setMode, resolved, accent, setAccent, customBg, setCustomBg],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
