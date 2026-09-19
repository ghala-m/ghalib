import { useMemo } from "react";
import {
  buildDateMarks,
  buildSemesterGrid,
  weekdayLabels,
  type DateMark,
  type GridDay,
} from "@/lib/semester-grid";
import type { CalendarEvent, Course, CourseItem, TermCalendarEvent, TermRow } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

  const weekday = weekdayLabels(locale);
  const todayIso = new Date().toISOString().slice(0, 10);

  if (!months.length) {
    return <p className="text-sm text-muted-foreground">{t("semesterGridNoStartDate")}</p>;
  }

  return (
    <div dir={dir} className="semester-grid space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold">{term.name}</h2>
      </div>
      {months.map((m) => (
        <div
          key={`${m.year}-${m.monthIndex}`}
          className="overflow-hidden rounded-xl border border-border"
        >
          <div className="bg-muted/60 px-3 py-2 text-center text-sm font-semibold">
            {new Date(m.year, m.monthIndex, 1).toLocaleDateString(locale, {
              month: "long",
              year: "numeric",
            })}
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="w-14 border border-border bg-muted/30 px-1 py-1 font-medium text-muted-foreground">
                  {t("weekLabel")}
                </th>
                {weekday.map((label, i) => (
                  <th
                    key={i}
                    className="border border-border bg-muted/30 px-1 py-1 font-medium text-muted-foreground"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.weeks.map((w) => (
                <tr key={w.weekNumber}>
                  <th className="border border-border bg-muted/20 px-1 py-1 text-center font-medium text-muted-foreground">
                    {w.weekNumber}
                  </th>
                  {w.days.map((day, dayIdx) => (
                    <DayCell
                      key={`${w.weekNumber}-${dayIdx}`}
                      day={day}
                      isToday={day.date === todayIso}
                      marks={marksByDate.get(day.date)}
                      weekdayLabel={weekday[dayIdx] ?? ""}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
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
  marks?: DateMark[] | undefined;
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
      <p
        className={cn(
          "text-[11px] font-semibold tabular-nums",
          day.overflow ? "text-foreground" : "text-accent",
        )}
      >
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
