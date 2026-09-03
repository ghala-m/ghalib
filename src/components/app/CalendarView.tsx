import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff, ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import { primaryNickname,
  allItemsQuery,
  coursesQuery,
  eventsQuery,
  meetingDayIndex,
  meetingsOf,
  termsQuery,
  type CalendarEvent,
  type Course,
} from "@/lib/queries";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { CATEGORY_META } from "@/lib/plan";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { EventDialog } from "@/components/app/EventDialog";
import { ItemDialog } from "@/components/app/ItemDialog";
import { notificationState, requestNotificationPermission, useReminders } from "@/hooks/useReminders";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type View = "day" | "week" | "month";

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


/** Shared calendar. Pass `courseId` to scope every view to a single course. */
export function CalendarView({ courseId, compact }: { courseId?: string; compact?: boolean } = {}) {
  const { t, lang } = useI18n();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const { data: allItems = [] } = useQuery(allItemsQuery());
  const { data: courses = [] } = useQuery(coursesQuery());
  const { data: allEvents = [] } = useQuery(eventsQuery());
  const { data: terms = [] } = useQuery(termsQuery());
  useReminders();

  const activeTerm = terms.find((term) => term.is_active) ?? null;

  const exportIcs = () => {
    const ics = buildIcs({
      courses,
      items: allItems,
      events: allEvents,
      activeTerm,
      calendarName: t("appName"),
    });
    downloadIcs("ghalib-schedule.ics", ics);
    toast.success(t("icsExported"));
  };

  const locale = lang === "ar" ? "ar" : "en-GB";
  const items = courseId ? allItems.filter((i) => i.course_id === courseId) : allItems;
  const events = courseId ? allEvents.filter((e) => e.course_id === courseId) : allEvents;
  const activeCourses = courses.filter(
    (c) => !c.archived && (courseId ? c.id === courseId : c.status === "current"),
  );

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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.event_date) ?? [];
      list.push(e);
      map.set(e.event_date, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.event_time ?? "").localeCompare(b.event_time ?? ""));
    return map;
  }, [events]);

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

  // Recurring class meetings only make sense *within* the active term's dates — without this,
  // a Sunday 9am class would render forever, on every week ever navigated to, past or future.
  const inTermRange = (date: Date) => {
    if (!activeTerm) return true; // no active term set — most permissive fallback, don't hide anything
    const d = iso(date);
    if (activeTerm.start_date && d < activeTerm.start_date) return false;
    if (activeTerm.end_date && d > activeTerm.end_date) return false;
    return true;
  };

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
        ? `${startOfWeek(cursor).toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${addDays(
            startOfWeek(cursor),
            6,
          ).toLocaleDateString(locale, { day: "numeric", month: "short" })}`
        : cursor.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  const notif = notificationState();

  return (
    <div className="panel-glass overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <div className="inline-flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => step(-1)} aria-label="previous">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => step(1)} aria-label="next">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <p className="font-semibold">{title}</p>
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
          {t("today")}
        </Button>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon" title={t("exportIcs")} onClick={exportIcs}>
            <Download className="size-4" />
          </Button>
          {notif !== "unsupported" && (
            <Button
              variant="ghost"
              size="icon"
              title={notif === "granted" ? t("notificationsOn") : t("enableNotifications")}
              onClick={async () => {
                if (notif === "denied") {
                  toast.error(t("notificationsBlocked"));
                  return;
                }
                const ok = await requestNotificationPermission();
                toast[ok ? "success" : "error"](ok ? t("notificationsOn") : t("notificationsBlocked"));
              }}
            >
              {notif === "granted" ? <Bell className="size-4 text-accent" /> : <BellOff className="size-4" />}
            </Button>
          )}
          {courseId ? (
            <ItemDialog
              courseId={courseId}
              defaultDate={iso(cursor)}
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="size-4" />
                  {t("addItem")}
                </Button>
              }
            />
          ) : null}
          <EventDialog
            {...(courseId ? { courseId } : {})}
            defaultDate={iso(cursor)}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                {t("addEvent")}
              </Button>
            }
          />
          <div className="inline-flex rounded-full border border-border p-1">
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
      </div>

      <div className={cn("p-4", compact && "p-3")}>
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
    const dayClasses = inTermRange(date) ? (classesByDay.get(date.getDay()) ?? []) : [];
    const dayEvents = eventsByDate.get(iso(date)) ?? [];
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
              <span className="font-medium">{primaryNickname(c.course.nickname) || c.course.code || c.course.name}</span>
              {c.start ? <span className="ms-1 text-muted-foreground">{c.start}</span> : null}
            </Link>
          ))}
          {dayItems.map((it) => (
            <ItemDialog
              key={it.id}
              courseId={it.course_id}
              item={it}
              trigger={
                <button type="button" className="block w-full rounded-lg border border-border bg-card px-2 py-1.5 text-start text-xs">
                  <span className={cn("font-medium", it.completed && "text-muted-foreground line-through")}>{it.title}</span>
                  <span className="block truncate text-muted-foreground">
                    {t(it.type)}
                    {courseId ? "" : ` · ${primaryNickname(it.courses?.nickname) ?? it.courses?.code ?? it.courses?.name ?? ""}`}
                  </span>
                </button>
              }
            />
          ))}
          {dayEvents.map((e) => (
            <EventDialog
              key={e.id}
              event={e}
              trigger={
                <button
                  type="button"
                  className="block w-full rounded-lg border border-accent/40 bg-accent/10 px-2 py-1.5 text-start text-xs"
                >
                  <span className="font-medium">{e.title}</span>
                  <span className="block truncate text-muted-foreground">
                    {e.event_time ?? ""}
                    {e.remind_minutes ? " · 🔔" : ""}
                  </span>
                </button>
              }
            />
          ))}
          {!dayClasses.length && !dayItems.length && !dayEvents.length && (
            <p className="text-xs text-muted-foreground">{t("noEvents")}</p>
          )}
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
          const dayClasses = inTermRange(d) ? (classesByDay.get(d.getDay()) ?? []) : [];
          const dayEvents = eventsByDate.get(iso(d)) ?? [];
          const dim = d.getMonth() !== cursor.getMonth();
          const isToday = iso(d) === iso(new Date());
          return (
            <button
              key={iso(d)}
              type="button"
              onClick={() => {
                setCursor(d);
                setView("day");
              }}
              className={cn(
                "min-h-24 rounded-lg border border-border p-1.5 text-start text-xs transition-colors hover:border-accent",
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
                  {primaryNickname(c.course.nickname) || c.course.code || c.course.name}
                </p>
              ))}
              {dayItems.slice(0, 2).map((it) => (
                <p key={it.id} className="truncate text-muted-foreground">
                  • {it.title}
                </p>
              ))}
              {dayEvents.slice(0, 2).map((e) => (
                <p key={e.id} className="truncate text-accent">
                  ◆ {e.title}
                </p>
              ))}
            </button>
          );
        })}
      </div>
    );
  }
}
