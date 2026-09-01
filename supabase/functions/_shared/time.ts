// Shared by send-reminders and morning-briefing. Deno edge functions run on UTC — every
// "what time is it for this student" calculation MUST go through here, in the student's
// own IANA timezone (profiles.timezone), or reminders/briefings will fire at the wrong
// local time (or on the wrong day, near midnight) for anyone outside UTC.

const DOW_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export type LocalNow = { dateIso: string; minutes: number; dow: number };

/** The student's current local date, minutes-since-midnight, and day-of-week (0=Sun..6=Sat). */
export function localNow(at: Date, timeZone: string): LocalNow {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value])) as Record<string, string>;
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    dateIso: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute),
    dow: DOW_MAP[parts.weekday] ?? at.getDay(),
  };
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToHhmm(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
