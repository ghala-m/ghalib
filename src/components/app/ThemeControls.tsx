import { Monitor, Moon, Sun } from "lucide-react";
import { ACCENTS, useTheme, type ThemeMode } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MODES: { id: ThemeMode; icon: typeof Sun; key: "themeLight" | "themeDark" | "themeSystem" }[] = [
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
            mode === id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

export function AccentPicker() {
  const { accent, setAccent } = useTheme();
  const { t, lang } = useI18n();
  return (
    <div>
      <p className="text-sm font-medium">{t("accentColor")}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("accentHint")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
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
      </div>
    </div>
  );
}
