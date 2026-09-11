import { Monitor, Moon, Sun } from "lucide-react";
import { Pipette } from "lucide-react";
import { ACCENTS, isCustomAccent, useTheme, type ThemeMode } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MODES: {
  id: ThemeMode;
  icon: typeof Sun;
  key: "themeLight" | "themeDark" | "themeSystem";
}[] = [
  { id: "light", icon: Sun, key: "themeLight" },
  { id: "dark", icon: Moon, key: "themeDark" },
  { id: "system", icon: Monitor, key: "themeSystem" },
];

export function ThemeModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();
  const { t } = useI18n();
  return (
    <div className={cn("inline-flex rounded-full border border-border bg-card/60 p-1", className)}>
      {MODES.map(({ id, icon: Icon, key }) => (
        <button
          key={id}
          type="button"
          onClick={() => setMode(id)}
          title={t(key)}
          aria-label={t(key)}
          aria-pressed={mode === id}
          className={cn(
            "flex size-8 items-center justify-center rounded-full transition-colors",
            mode === id
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

export function AccentPicker() {
  const { accent, setAccent, customBg, setCustomBg } = useTheme();
  const { t, lang } = useI18n();
  const custom = isCustomAccent(accent);
  return (
    <div>
      <p className="text-sm font-medium">{t("accentColor")}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("accentHint")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAccent(a.id)}
            title={lang === "ar" ? a.labelAr : a.labelEn}
            aria-label={lang === "ar" ? a.labelAr : a.labelEn}
            aria-pressed={accent === a.id}
            className={cn(
              "size-9 rounded-full border-2 transition-transform hover:scale-110",
              accent === a.id ? "border-foreground" : "border-transparent",
            )}
            style={{ background: a.swatch }}
          />
        ))}
        <label
          className={cn(
            "relative flex size-9 cursor-pointer items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
            custom ? "border-foreground" : "border-dashed border-muted-foreground/50",
          )}
          style={custom ? { background: accent } : undefined}
          title={t("customColor")}
        >
          {!custom && <Pipette className="size-4 text-muted-foreground" />}
          <input
            type="color"
            aria-label={t("customColor")}
            value={custom ? accent : "#f59e0b"}
            onChange={(e) => setAccent(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
      {custom && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("customColor")}: {accent}
        </p>
      )}

      {/* Custom colour combination: background + accent picked independently, instead of
          choosing from curated presets. */}
      <div className="mt-4 rounded-xl border border-dashed border-border p-3">
        <p className="text-sm font-medium">{t("customCombo")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("customComboHint")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <label
              className="relative size-9 cursor-pointer overflow-hidden rounded-full border-2 border-border transition-transform hover:scale-110"
              style={{ background: customBg ?? "var(--background)" }}
              title={t("customComboBg")}
            >
              <input
                type="color"
                aria-label={t("customComboBg")}
                value={customBg ?? "#1a2333"}
                onChange={(e) => setCustomBg(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <span className="text-xs text-muted-foreground">{t("customComboBg")}</span>
          </div>
          <div className="flex items-center gap-2">
            <label
              className="relative size-9 cursor-pointer overflow-hidden rounded-full border-2 border-border transition-transform hover:scale-110"
              style={{ background: custom ? accent : "var(--accent)" }}
              title={t("customComboAccent")}
            >
              <input
                type="color"
                aria-label={t("customComboAccent")}
                value={custom ? accent : "#f59e0b"}
                onChange={(e) => setAccent(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <span className="text-xs text-muted-foreground">{t("customComboAccent")}</span>
          </div>
          {customBg ? (
            <button
              type="button"
              onClick={() => setCustomBg(null)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {t("customComboReset")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
