/**
 * Builds the "paper planner" grid the student used to fill by hand: weeks run
 * Saturday → Friday, are numbered continuously across the whole term (Week 1, 2, 3…
 * never resetting per month), and are grouped visually under the month that owns
 * most of their 7 days. Days that spill into the previous/next month are kept in
 * the week (so the week always has 7 cells) but flagged `overflow: true` so the
 * UI can render them muted, exactly like the black-ink numbers in the paper version.
 */

export type GridDay = {
  date: string; // ISO yyyy-mm-dd
  dayOfMonth: number;
  /** true when this day belongs to the adjacent month, not the month this week is grouped under */
  overflow: boolean;
};

export type GridWeek = {
  /** 1-based, continuous across the entire term */
  weekNumber: number;
  /** the month (0-11) this week is grouped under, chosen by majority of its 7 days */
  monthIndex: number;
  year: number;
  days: GridDay[]; // always 7, Saturday first, Friday last
};

export type GridMonth = {
  monthIndex: number; // 0-11
  year: number;
  weeks: GridWeek[];
};

const MS_DAY = 24 * 60 * 60 * 1000;

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIsoDate(iso: string): Date {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

/** JS getDay(): Sun=0..Sat=6. We want Saturday-first: Sat=0, Sun=1, ... Fri=6. */
function satFirstIndex(jsDay: number) {
  return (jsDay + 1) % 7;
}

/** Saturday on/before the given date. */
function startOfSaturdayWeek(d: Date): Date {
  const back = satFirstIndex(d.getDay());
  const c = new Date(d);
  c.setDate(c.getDate() - back);
  return c;
}

export type BuildSemesterGridOptions = {
  /** ISO yyyy-mm-dd — any date within week 1; will be snapped back to that week's Saturday */
  startDate: string;
  /** number of weeks to generate. Provide this or endDate. */
  weeksCount?: number;
  /** ISO yyyy-mm-dd — used to derive weeksCount when weeksCount is not given */
  endDate?: string;
};

export function buildSemesterGrid({
  startDate,
  weeksCount,
  endDate,
}: BuildSemesterGridOptions): GridMonth[] {
  const anchor = startOfSaturdayWeek(parseIsoDate(startDate));

  let weeks: number;
  if (weeksCount) {
    weeks = weeksCount;
  } else {
    if (!endDate) throw new Error("Provide weeksCount or endDate");
    const end = parseIsoDate(endDate);
    const diffDays = Math.round((end.getTime() - anchor.getTime()) / MS_DAY);
    weeks = Math.max(1, Math.ceil((diffDays + 1) / 7));
  }

  const gridWeeks: GridWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(anchor);
    weekStart.setDate(weekStart.getDate() + w * 7);

    const days: GridDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return {
        date: toIso(d),
        dayOfMonth: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
      };
    }) as unknown as (GridDay & { month: number; year: number })[];

    // majority month across the 7 days (tie → the earlier day's month, i.e. first occurrence wins)
    const counts = new Map<string, number>();
    for (const d of days as unknown as { month: number; year: number }[]) {
      const key = `${d.year}-${d.month}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let ownerKey = "";
    let best = -1;
    for (const d of days as unknown as { month: number; year: number }[]) {
      const key = `${d.year}-${d.month}`;
      const c = counts.get(key)!;
      if (c > best) {
        best = c;
        ownerKey = key;
      }
    }
    const ownerParts = ownerKey.split("-");
    const ownerYear = Number(ownerParts[0]);
    const ownerMonth = Number(ownerParts[1]);

    const finalDays: GridDay[] = (
      days as unknown as { date: string; dayOfMonth: number; month: number; year: number }[]
    ).map((d) => ({
      date: d.date,
      dayOfMonth: d.dayOfMonth,
      overflow: d.month !== ownerMonth || d.year !== ownerYear,
    }));

    gridWeeks.push({ weekNumber: w + 1, monthIndex: ownerMonth, year: ownerYear, days: finalDays });
  }

  const months: GridMonth[] = [];
  for (const week of gridWeeks) {
    let month = months.find((m) => m.monthIndex === week.monthIndex && m.year === week.year);
    if (!month) {
      month = { monthIndex: week.monthIndex, year: week.year, weeks: [] };
      months.push(month);
    }
    month.weeks.push(week);
  }
  return months;
}

/** Saturday-first weekday short labels, in the given locale. */
export function weekdayLabels(locale: string): string[] {
  // 2026-01-03 is a Saturday — safe fixed anchor to read labels off of.
  const anchor = new Date(2026, 0, 3);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString(locale, { weekday: "short" });
  });
}
