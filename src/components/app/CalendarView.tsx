import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { allItemsQuery, coursesQuery, meetingsOf, type Course } from "@/lib/queries";
import { CATEGORY_META } from "@/lib/plan";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type View = "day" | "week" | "month";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function startOfWeek(d: Date) {
  return addDays(d, -d.getDay());
}

function meetingDayIndex(day: string) {
  const v = day.trim().toLowerCase();
  const en = DAY_KEYS.findIndex((k) => v.startsWith(k.slice(0, 3)));
  if (en >= 0) return en;
  const ar = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const i = ar.findIndex((k) => v.includes(k.replace("ال", "")));
  return i;
}

export function CalendarView() {
  const { t, lang } = useI18n();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const { data: items = [] } = useQuery(allItemsQuery());
  const { data: courses = [] } = useQuery(coursesQuery());

  const locale = lang === "ar" ? "ar" : "en-GB";
  const activeCourses = courses.filter((c) => c.status === "current" && !c.archived);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const it of items) {
      if (!it.due_date) continue;
      const list = map.get(it.due_date) ?? [];
      list.push(it);
      map.set(it.due_date, list);
    }
    return map;
  }, [items]);

  const classesByDay = useMemo(() => {
    const map = new Map<number, { course: Course; start: string | null; end: string | null; location: string | null }[]>();
    for (const c of activeCourses) {
      for (const m of meetingsOf(c)) {
        const idx = meetingDayIndex(m.day);
        if (idx < 0) continue;
        const list = map.get(idx) ?? [];
        list.push({ course: c, start: m.start_time, end: m.end_time, location: m.location });
        map.set(idx, list);
      }
    }
    for (const list of map.values()) list.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
    return map;
  }, [activeCourses]);

  const step = (dir: number) => {
    if (view === "day") setCursor((d) => addDays(d, dir));
    else if (view === "week") setCursor((d) => addDays(d, dir * 7));
    else
      setCursor((d) => {
        const c = new Date(d);
        c.setMonth(c.getMonth() + dir);
        return c;
      });
  };

  const title =
    view === "month"
      ? cursor.toLocaleDateString(locale, { month: "long", year: "numeric" })
      : view === "week"
        ? `${startOfWeek(cursor).toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${addDays(startOfWeek(cursor), 6).toLocaleDateString(locale, { day: "numeric", month: "short" })}`
        : cursor.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="panel-glass">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => step(-1)} aria-label="previous">
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => step(1)} aria-label="next">
            <ChevronRight className="size-4 rtl:rotate-180" />
          </Button>
        </div>
        <p className="font-semibold">{title}</p>
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
          {t("today")}
        </Button>
        <div className="ms-auto inline-flex rounded-full border border-border p-1">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                view === v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {view === "day" && <DayColumn date={cursor} full />}
        {view === "week" && (
          <div className="grid gap-3 md:grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)).map((d) => (
              <DayColumn key={iso(d)} date={d} />
            ))}
          </div>
        )}
        {view === "month" && <MonthGrid />}
      </div>
    </div>
  );

  function DayColumn({ date, full }: { date: Date; full?: boolean }) {
    const dayItems = itemsByDate.get(iso(date)) ?? [];
    const dayClasses = classesByDay.get(date.getDay()) ?? [];
    const isToday = iso(date) === iso(new Date());
    return (
      <div className={cn("rounded-xl border border-border p-3", isToday && "border-accent bg-accent/5", full && "min-h-64")}>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          {date.toLocaleDateString(locale, { weekday: "short", day: "numeric" })}
        </p>
        <div className="space-y-1.5">
          {dayClasses.map((c, i) => (
            <Link
              key={`${c.course.id}-${i}`}
              to="/courses/$courseId"
              params={{ courseId: c.course.id }}
              className="block rounded-lg px-2 py-1.5 text-xs"
              style={{
                background: `color-mix(in oklab, ${CATEGORY_META[c.course.category].color} 16%, transparent)`,
                borderInlineStart: `3px solid ${CATEGORY_META[c.course.category].color}`,
              }}
            >
              <span className="font-medium">{c.course.code || c.course.name}</span>
              {c.start ? <span className="ms-1 text-muted-foreground">{c.start}</span> : null}
            </Link>
          ))}
          {dayItems.map((it) => (
            <Link
              key={it.id}
              to="/courses/$courseId"
              params={{ courseId: it.course_id }}
              className="block rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
            >
              <span className="font-medium">{it.title}</span>
              <span className="block truncate text-muted-foreground">
                {t(it.type)} · {it.courses?.code || it.courses?.name}
              </span>
            </Link>
          ))}
          {!dayClasses.length && !dayItems.length && <p className="text-xs text-muted-foreground">{t("noEvents")}</p>}
        </div>
      </div>
    );
  }

  function MonthGrid() {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    return (
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d) => {
          const dayItems = itemsByDate.get(iso(d)) ?? [];
          const dayClasses = classesByDay.get(d.getDay()) ?? [];
          const dim = d.getMonth() !== cursor.getMonth();
          const isToday = iso(d) === iso(new Date());
          return (
            <div
              key={iso(d)}
              className={cn(
                "min-h-24 rounded-lg border border-border p-1.5 text-xs",
                dim && "opacity-40",
                isToday && "border-accent bg-accent/5",
              )}
            >
              <p className="mb-1 font-medium tabular-nums">{d.getDate()}</p>
              {dayClasses.slice(0, 2).map((c, i) => (
                <p
                  key={i}
                  className="mb-0.5 truncate rounded px-1"
                  style={{ background: `color-mix(in oklab, ${CATEGORY_META[c.course.category].color} 18%, transparent)` }}
                >
                  {c.course.code || c.course.name}
                </p>
              ))}
              {dayItems.slice(0, 2).map((it) => (
                <p key={it.id} className="truncate text-muted-foreground">
                  • {it.title}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    );
  }
}
