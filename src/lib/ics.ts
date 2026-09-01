import { meetingDayIndex, meetingsOf, type CalendarEvent, type Course, type CourseItem, type TermRow } from "@/lib/queries";

const ICS_DOW = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Escapes text per RFC 5545 (comma, semicolon, backslash, newline). */
function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function utcStamp(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes(),
  )}${pad(d.getUTCSeconds())}Z`;
}

/** "YYYY-MM-DD" + "HH:MM" -> floating local "YYYYMMDDTHHMMSS" (no timezone conversion, matches what the user typed). */
function floatingDateTime(dateStr: string, timeStr: string) {
  return `${dateStr.replace(/-/g, "")}T${timeStr.replace(":", "")}00`;
}

function allDayDate(dateStr: string) {
  return dateStr.replace(/-/g, "");
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextOrSameWeekday(from: Date, targetDow: number) {
  const d = new Date(from);
  d.setDate(d.getDate() + ((targetDow - d.getDay() + 7) % 7));
  return d;
}

type Lines = string[];

function pushEvent(
  lines: Lines,
  opts: {
    uid: string;
    title: string;
    description?: string | null | undefined;
    location?: string | null | undefined;
    dtstart: string; // pre-formatted ICS value (already includes VALUE=DATE if needed via `allDay`)
    dtend?: string | undefined;
    allDay?: boolean | undefined;
    rrule?: string | undefined;
    alarmMinutesBefore?: number | undefined;
  },
) {
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${opts.uid}`);
  lines.push(`DTSTAMP:${utcStamp(new Date())}`);
  lines.push(opts.allDay ? `DTSTART;VALUE=DATE:${opts.dtstart}` : `DTSTART:${opts.dtstart}`);
  if (opts.dtend) lines.push(opts.allDay ? `DTEND;VALUE=DATE:${opts.dtend}` : `DTEND:${opts.dtend}`);
  if (opts.rrule) lines.push(`RRULE:${opts.rrule}`);
  lines.push(`SUMMARY:${escapeText(opts.title)}`);
  if (opts.description) lines.push(`DESCRIPTION:${escapeText(opts.description)}`);
  if (opts.location) lines.push(`LOCATION:${escapeText(opts.location)}`);
  if (opts.alarmMinutesBefore != null && opts.alarmMinutesBefore > 0) {
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${escapeText(opts.title)}`);
    lines.push(`TRIGGER:-PT${opts.alarmMinutesBefore}M`);
    lines.push("END:VALARM");
  }
  lines.push("END:VEVENT");
}

/**
 * Builds a full .ics calendar covering: recurring weekly class meetings for the student's
 * current-term courses, every checklist item with a due date, and every custom calendar event.
 * Meant to be imported once or (if the user re-downloads later) re-imported — most calendar apps
 * de-duplicate by UID, so re-importing after adding a few courses is safe.
 */
export function buildIcs(params: {
  courses: Course[];
  items: CourseItem[];
  events: CalendarEvent[];
  activeTerm?: TermRow | null;
  calendarName: string;
}): string {
  const { courses, items, events, activeTerm, calendarName } = params;
  const lines: Lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Ghalib//Academic Assistant//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push(`X-WR-CALNAME:${escapeText(calendarName)}`);

  const termStart = activeTerm?.start_date ? new Date(activeTerm.start_date) : new Date();
  const termEnd = activeTerm?.end_date ? new Date(activeTerm.end_date) : addDays(new Date(), 16 * 7);

  // Recurring class meetings, current-term courses only.
  const activeCourses = courses.filter((c) => !c.archived && c.status === "current");
  for (const course of activeCourses) {
    for (const [i, m] of meetingsOf(course).entries()) {
      const dow = meetingDayIndex(m.day);
      if (dow < 0 || !m.start_time) continue;
      const first = nextOrSameWeekday(termStart, dow);
      const dateStr = toIsoDate(first);
      const dtstart = floatingDateTime(dateStr, m.start_time);
      const dtend = m.end_time ? floatingDateTime(dateStr, m.end_time) : undefined;
      const until = `${allDayDate(toIsoDate(termEnd))}T235959Z`;
      pushEvent(lines, {
        uid: `class-${course.id}-${i}@ghalib`,
        title: course.nickname || course.code || course.name,
        description: course.instructor ? `${course.name} — ${course.instructor}` : course.name,
        location: m.location,
        dtstart,
        dtend,
        rrule: `FREQ=WEEKLY;BYDAY=${ICS_DOW[dow]};UNTIL=${until}`,
        alarmMinutesBefore: 30,
      });
    }
  }

  // Checklist items with a due date (assignments, exams, quizzes, projects).
  for (const item of items) {
    if (!item.due_date || item.completed) continue;
    if (item.due_time) {
      const dtstart = floatingDateTime(item.due_date, item.due_time);
      pushEvent(lines, {
        uid: `item-${item.id}@ghalib`,
        title: item.title,
        description: item.description,
        dtstart,
        alarmMinutesBefore: 60,
      });
    } else {
      const day = allDayDate(item.due_date);
      pushEvent(lines, {
        uid: `item-${item.id}@ghalib`,
        title: item.title,
        description: item.description,
        dtstart: day,
        dtend: allDayDate(toIsoDate(addDays(new Date(item.due_date), 1))),
        allDay: true,
      });
    }
  }

  // Custom calendar events.
  for (const event of events) {
    if (event.event_time) {
      const dtstart = floatingDateTime(event.event_date, event.event_time);
      pushEvent(lines, {
        uid: `event-${event.id}@ghalib`,
        title: event.title,
        dtstart,
        alarmMinutesBefore: event.remind_minutes ?? undefined,
      });
    } else {
      const day = allDayDate(event.event_date);
      pushEvent(lines, {
        uid: `event-${event.id}@ghalib`,
        title: event.title,
        dtstart: day,
        dtend: allDayDate(toIsoDate(addDays(new Date(event.event_date), 1))),
        allDay: true,
      });
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Triggers a browser download of the given .ics content. */
export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
