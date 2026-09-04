import { useMemo } from "react";
import { buildSemesterGrid, weekdayLabels, type GridDay } from "@/lib/semester-grid";
import type { CalendarEvent, Course, CourseItem, TermCalendarEvent, TermRow } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DayMark = { kind: "item" | "event" | "milestone"; label: string; color?: string };

export function SemesterGrid({
  term,
  items = [],
  events = [],
  milestones = [],
  courses = [],
}: {
  term: Pick<TermRow, "name" | "start_date" | "end_date" | "weeks_count">;
  items?: CourseItem[];
  events?: CalendarEvent[];
  milestones?: TermCalendarEvent[];
  courses?: Course[];
}) {
  const { t, lang, dir } = useI18n();
  const locale = lang === "ar" ? "ar" : "en-GB";

  const months = useMemo(() => {
    if (!term.start_date) return [];
    try {
      if (term.weeks_count) {
        return buildSemesterGrid({ startDate: term.start_date, weeksCount: term.weeks_count });
      }
      if (term.end_date) {
        return buildSemesterGrid({ startDate: term.start_date, endDate: term.end_date });
      }
      return buildSemesterGrid({ startDate: term.start_date, weeksCount: 16 });
    } catch {
      return [];
    }
  }, [term.start_date, term.end_date, term.weeks_count]);

  const marksByDate = useMemo(() => {
    const map = new Map<string, DayMark[]>();
    const push = (date: string, mark: DayMark) => {
      const list = map.get(date) ?? [];
      list.push(mark);
      map.set(date, list);
    };
    const courseName = (id: string | null) => {
      const c = courses.find((x) => x.id === id);
      return c?.nickname || c?.code || c?.name || "";
    };
    for (const it of items) {
      if (!it.due_date) continue;
      push(it.due_date, { kind: "item", label: it.title || courseName(it.course_id) });
    }
    for (const e of events) {
      push(e.event_date, { kind: "event", label: e.title });
    }
    for (const m of milestones) {
      const start = new Date(m.start_date);
      const end = m.end_date ? new Date(m.end_date) : start;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        push(iso, { kind: "milestone", label: m.title });
      }
    }
    return map;
  }, [items, events, milestones, courses]);

  const weekday = weekdayLabels(locale);
  const todayIso = new Date().toISOString().slice(0, 10);

  if (!months.length) {
    return <p className="text-sm text-muted-foreground">{t("semesterGridNoStartDate")}</p>;
  }

  return (
    <div dir={dir} className="semester-grid overflow-x-auto">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold">{term.name}</h2>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {months.map((m) => (
              <th
                key={`${m.year}-${m.monthIndex}`}
                colSpan={m.weeks.length}
                className="border border-border bg-muted/60 px-2 py-1.5 text-sm font-semibold"
              >
                {new Date(m.year, m.monthIndex, 1).toLocaleDateString(locale, {
                  month: "long",
                  year: "numeric",
                })}
              </th>
            ))}
          </tr>
          <tr>
            {months.flatMap((m) =>
              m.weeks.map((w) => (
                <th
                  key={w.weekNumber}
                  className="border border-border bg-muted/30 px-1 py-1 font-medium text-muted-foreground [writing-mode:vertical-rl]"
                >
                  {t("weekLabel")} {w.weekNumber}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 7 }, (_, dayIdx) => (
            <tr key={dayIdx}>
              {months.flatMap((m) =>
                m.weeks.map((w) => {
                  const day = w.days[dayIdx];
                  if (!day) return null;
                  return (
                    <DayCell
                      key={`${w.weekNumber}-${dayIdx}`}
                      day={day}
                      isToday={day.date === todayIso}
                      marks={marksByDate.get(day.date)}
                      weekdayLabel={weekday[dayIdx] ?? ""}
                    />
                  );
                }),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayCell({
  day,
  isToday,
  marks,
  weekdayLabel,
}: {
  day: GridDay;
  isToday: boolean;
  marks?: DayMark[] | undefined;
  weekdayLabel: string;
}) {
  return (
    <td
      className={cn(
        "min-w-16 border border-border align-top p-1",
        day.overflow ? "bg-muted/20 text-muted-foreground" : "bg-card",
        isToday && "outline outline-2 outline-accent -outline-offset-2",
      )}
      title={weekdayLabel}
    >
      <p className={cn("text-[11px] font-semibold tabular-nums", !day.overflow && "text-accent")}>
        {day.dayOfMonth}
      </p>
      {marks?.slice(0, 3).map((mk, i) => (
        <p
          key={i}
          className={cn(
            "mt-0.5 truncate rounded-sm px-0.5 text-[9px] leading-tight",
            mk.kind === "milestone" && "bg-destructive/15 text-destructive",
            mk.kind === "item" && "bg-accent/15 text-accent-foreground",
            mk.kind === "event" && "bg-primary/10",
          )}
        >
          {mk.label}
        </p>
      ))}
      {marks && marks.length > 3 ? (
        <p className="text-[9px] text-muted-foreground">+{marks.length - 3}</p>
      ) : null}
    </td>
  );
}
