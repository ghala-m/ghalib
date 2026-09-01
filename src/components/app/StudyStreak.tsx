import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isMissingSchemaError } from "@/lib/db-errors";
import { Flame, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { logStreakToday, streakQuery } from "@/lib/queries";
import { buildStreakGrid, computeStreaks, type StreakDay } from "@/lib/streak";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted",
  1: "bg-cat-general/30",
  2: "bg-cat-general/55",
  3: "bg-cat-general/80",
  4: "bg-cat-general",
};

const DAY_LABEL_ROWS = [1, 3, 5]; // Mon, Wed, Fri — matches the reference layout, rest stay blank

function Cell({ day, label }: { day: StreakDay; label: string }) {
  if (day.isFuture || day.level === null) return <div className="size-[11px] rounded-[3px]" />;
  return (
    <div
      title={`${label} · ${day.count}`}
      className={cn("size-[11px] rounded-[3px] transition-transform hover:scale-125", LEVEL_CLASS[day.level])}
    />
  );
}

export function StudyStreak() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: entries = [] } = useQuery(streakQuery());
  const weeksBack = 53;

  const log = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await logStreakToday(user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["streak"] });
      toast.success(t("streakLogged"));
    },
    onError: (e: Error) => toast.error(isMissingSchemaError(e) ? t("migrationMissingHint") : t("saveFailed")),
  });

  const { weeks, monthLabels } = buildStreakGrid(entries, weeksBack);
  const { current, longest } = computeStreaks(entries);
  const totalDays = entries.filter((e) => e.count > 0).length;

  const monthFmt = new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { month: "short", calendar: "gregory" });
  const weekdayFmt = new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { weekday: "short", calendar: "gregory" });
  const dayFmt = new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    calendar: "gregory",
  });

  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {totalDays} {t("streakTitle")}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flame className="size-3.5 text-accent" />
              {current} {t("streakCurrent")}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="size-3.5 text-cat-major" />
              {longest} {t("streakLongest")}
            </span>
          </div>
        </div>
        <Button size="sm" disabled={log.isPending} onClick={() => log.mutate()}>
          <Plus className="size-4" />
          {t("streakLogToday")}
        </Button>
      </div>

      <div className="mt-5 overflow-x-auto" dir="ltr">
        <div className="inline-flex gap-2">
          <div className="flex flex-col gap-[3px] pt-4 text-[10px] text-muted-foreground">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="h-[11px] leading-[11px]">
                {DAY_LABEL_ROWS.includes(i) ? weekdayFmt.format(new Date(2026, 0, 4 + i)) : ""}
              </span>
            ))}
          </div>

          <div>
            <div
              className="mb-1 grid text-[10px] text-muted-foreground"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, 14px)` }}
            >
              {weeks.map((_, wi) => {
                const label = monthLabels.find((m) => m.weekIndex === wi);
                return (
                  <span key={wi} style={{ gridColumnStart: wi + 1 }}>
                    {label ? monthFmt.format(new Date(2026, label.month, 1)) : ""}
                  </span>
                );
              })}
            </div>
            <div
              className="grid gap-[3px]"
              style={{ gridTemplateRows: "repeat(7, 11px)", gridAutoFlow: "column", gridAutoColumns: "11px" }}
            >
              {weeks.flat().map((day) => (
                <Cell key={day.date} day={day} label={dayFmt.format(new Date(`${day.date}T00:00:00`))} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground" dir="ltr">
        <span>{t("streakLess")}</span>
        {([0, 1, 2, 3, 4] as const).map((l) => (
          <div key={l} className={cn("size-[10px] rounded-[2px]", LEVEL_CLASS[l])} />
        ))}
        <span>{t("streakMore")}</span>
      </div>
    </div>
  );
}
