export type StreakEntry = { log_date: string; count: number };
export type StreakDay = { date: string; count: number | null; level: 0 | 1 | 2 | 3 | 4 | null; isFuture: boolean };
export type StreakWeek = StreakDay[];
export type MonthLabel = { weekIndex: number; month: number };

/** Great-circle distance between two lat/lng points, in meters — used by the auto-streak
 * geolocation check to tell "student is on campus" from "student is somewhere else". */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parses a "YYYY-MM-DD" string as a *local* midnight Date. `new Date("YYYY-MM-DD")` parses as
 *  UTC midnight instead, which silently shifts the date by a day in any negative-UTC-offset
 *  timezone once read back through local getters (getDate/getMonth/...) — always use this. */
function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

/**
 * Builds a GitHub-contributions-style grid: `weeksBack` columns of 7 days (Sun-Sat), ending on
 * today's week. Days after today are marked `isFuture` (level `null`) so the UI can render them
 * as empty placeholders instead of "0 activity" — those aren't real data, just grid padding.
 */
export function buildStreakGrid(entries: StreakEntry[], weeksBack = 53): { weeks: StreakWeek[]; monthLabels: MonthLabel[] } {
  const byDate = new Map(entries.map((e) => [e.log_date, e.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - (weeksBack * 7 - 1));
  start.setDate(start.getDate() - start.getDay()); // back up to the preceding Sunday

  const days: Date[] = [];
  for (const d = new Date(start); ; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
    if (d >= today && d.getDay() === 6) break; // stop once the week containing today is complete
  }

  const weeks: StreakWeek[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(
      days.slice(i, i + 7).map((d) => {
        const isFuture = d > today;
        const count = isFuture ? null : (byDate.get(toIso(d)) ?? 0);
        return { date: toIso(d), count, level: count === null ? null : levelFor(count), isFuture };
      }),
    );
  }

  const monthLabels: MonthLabel[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const monthStart = week.find((d) => Number(d.date.slice(8, 10)) <= 7);
    if (!monthStart) return;
    const month = Number(monthStart.date.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      monthLabels.push({ weekIndex, month });
      lastMonth = month;
    }
  });

  return { weeks, monthLabels };
}

/** Current streak (consecutive days up to today, or up to yesterday if today has no log yet) and the longest ever. */
export function computeStreaks(entries: StreakEntry[], todayIso = toIso(new Date())): { current: number; longest: number } {
  const logged = new Set(entries.filter((e) => e.count > 0).map((e) => e.log_date));

  const sorted = [...logged].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev) {
      const expected = fromIso(prev);
      expected.setDate(expected.getDate() + 1);
      run = toIso(expected) === d ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  let current = 0;
  const cursor = fromIso(todayIso);
  if (!logged.has(todayIso)) cursor.setDate(cursor.getDate() - 1);
  while (logged.has(toIso(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
}
