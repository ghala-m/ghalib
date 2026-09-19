import { useMemo } from "react";
import {
  buildDateMarks,
  buildSemesterGrid,
  type DateMark,
  type GridDay,
  type GridMonth,
} from "@/lib/semester-grid";
import type { CalendarEvent, Course, CourseItem, TermCalendarEvent, TermRow } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Deliberately NOT a standard "weeks as rows, days as columns" month grid. This follows the
 * student's own hand-drawn wall-planner design: months are rows (stacked top to bottom, the
 * whole term visible at once), each month's weeks sit side by side as column-blocks within that
 * row (using `flex-1` per block, so a short month's weeks end up visibly wider than a long
 * month's — matching the reference design, where September's 2 weeks are noticeably wider boxes
 * than November's 5), and each week is 7 narrow, tall day-columns (Saturday → Friday) rather than
 * the usual 7-wide-short-tall row, specifically to leave visual "room to write a note" under each
 * date the way the paper version does. See term-calendar-pdf.ts for the printable version of the
 * same layout.
 */
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
    const courseName = (id: string | null) => {
      const c = courses.find((x) => x.id === id);
      return c?.nickname || c?.code || c?.name || "";
    };
    return buildDateMarks({ items, events, milestones, courseLabel: courseName });
  }, [items, events, milestones, courses]);

  const todayIso = new Date().toISOString().slice(0, 10);

  if (!months.length) {
    return <p className="text-sm text-muted-foreground">{t("semesterGridNoStartDate")}</p>;
  }

  return (
    <div dir={dir} className="semester-grid space-y-3">
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-center">
        <h2 className="text-lg font-bold tracking-wide">{term.name}</h2>
      </div>
      <div className="space-y-2">
        {months.map((m) => (
          <MonthRow
            key={`${m.year}-${m.monthIndex}`}
            month={m}
            locale={locale}
            todayIso={todayIso}
            marksByDate={marksByDate}
          />
        ))}
      </div>
    </div>
  );
}

function MonthRow({
  month,
  locale,
  todayIso,
  marksByDate,
}: {
  month: GridMonth;
  locale: string;
  todayIso: string;
  marksByDate: Map<string, DateMark[]>;
}) {
  const monthLabel = new Date(month.year, month.monthIndex, 1).toLocaleDateString(locale, {
    month: "short",
  });

  return (
    <div className="flex gap-1.5">
      <div
        className="flex w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-center text-xs font-semibold text-muted-foreground"
        style={{ writingMode: "vertical-rl" }}
      >
        {monthLabel}
      </div>
      <div className="flex flex-1 gap-1.5 overflow-x-auto">
        {month.weeks.map((week) => (
          <div
            key={week.weekNumber}
            className="flex min-w-[150px] flex-1 flex-col overflow-hidden rounded-lg border border-border"
          >
            <div className="bg-muted/50 py-1 text-center text-xs font-semibold text-muted-foreground">
              {week.weekNumber}
            </div>
            <div className="flex flex-1">
              {week.days.map((day, dayIdx) => (
                <DayCell
                  key={`${week.weekNumber}-${dayIdx}`}
                  day={day}
                  isToday={day.date === todayIso}
                  marks={marksByDate.get(day.date)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  isToday,
  marks,
}: {
  day: GridDay;
  isToday: boolean;
  marks?: DateMark[] | undefined;
}) {
  return (
    <div
      className={cn(
        "flex min-h-28 flex-1 flex-col border-e border-border/70 p-1 last:border-e-0",
        day.overflow ? "bg-muted/20" : "bg-card",
        isToday && "outline outline-2 outline-accent -outline-offset-2",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold tabular-nums",
          day.overflow ? "text-foreground" : "text-accent",
        )}
      >
        {day.dayOfMonth}
      </p>
      <div className="mt-0.5 flex flex-1 flex-col gap-0.5 overflow-hidden">
        {marks?.slice(0, 4).map((mk, i) => (
          <p
            key={i}
            className={cn(
              "truncate rounded-sm px-0.5 text-[8px] leading-tight",
              mk.kind === "milestone" && "bg-destructive/15 text-destructive",
              mk.kind === "item" && "bg-accent/15 text-accent-foreground",
              mk.kind === "event" && "bg-primary/10",
            )}
          >
            {mk.label}
          </p>
        ))}
        {marks && marks.length > 4 ? (
          <p className="text-[8px] text-muted-foreground">+{marks.length - 4}</p>
        ) : null}
      </div>
    </div>
  );
}
