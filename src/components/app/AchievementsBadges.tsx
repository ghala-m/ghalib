import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { coursesQuery, profileQuery, streakQuery, termsQuery } from "@/lib/queries";
import { ACHIEVEMENTS, unlockedIds, type AchievementContext } from "@/lib/achievements";
import { isSoundEnabled, playUnlockChime, setSoundEnabled } from "@/lib/sound";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEEN_KEY = "ghalib.seenAchievements";

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveSeen(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

export function AchievementsBadges() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: courses = [] } = useQuery(coursesQuery());
  const { data: terms = [] } = useQuery(termsQuery());
  const { data: streak = [] } = useQuery(streakQuery());
  const { data: profile } = useQuery(profileQuery(user?.id));
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const ctx: AchievementContext = useMemo(
    () => ({ courses, terms, streak, profile }),
    [courses, terms, streak, profile],
  );

  const unlocked = useMemo(() => new Set(unlockedIds(ctx)), [ctx]);

  // Freshly unlocked (this session or since we last checked) → celebrate with a toast + chime.
  useEffect(() => {
    if (!courses.length && !terms.length) return; // wait for real data before judging "new"
    const seen = loadSeen();
    const fresh = [...unlocked].filter((id) => !seen.has(id));
    if (fresh.length) {
      for (const id of fresh) {
        toast.success(t(`ach_${id}_title` as never), { description: t(`ach_${id}_desc` as never) });
      }
      playUnlockChime();
      saveSeen(new Set([...seen, ...unlocked]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playUnlockChime();
  };

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unlocked.size}/{ACHIEVEMENTS.length} {t("achievementsUnlockedOf")}
        </p>
        <Button variant="ghost" size="sm" onClick={toggleSound} aria-label={t("toggleSound")}>
          {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          {t("toggleSound")}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const progress = a.progress(ctx);
          const isUnlocked = progress >= 1;
          const Icon = a.icon;
          return (
            <div
              key={a.id}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                isUnlocked ? "border-accent/40 bg-accent/5" : "border-border bg-muted/20",
              )}
              title={t(`ach_${a.id}_desc` as never)}
            >
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-full",
                  isUnlocked
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {isUnlocked ? <Icon className="size-5" /> : <Lock className="size-4" />}
              </div>
              <p className="text-xs font-semibold">{t(`ach_${a.id}_title` as never)}</p>
              {!isUnlocked ? (
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent/60"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
