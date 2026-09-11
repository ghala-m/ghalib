import { CATEGORY_ORDER } from "@/lib/plan";
import type { Course, CourseCategory } from "@/lib/queries";

export type RoadmapCategory = {
  category: CourseCategory;
  totalCredits: number;
  completedCredits: number;
  inProgressCredits: number;
  totalCourses: number;
  completedCourses: number;
  remaining: Course[];
};

export type Roadmap = {
  categories: RoadmapCategory[];
  totalCredits: number;
  completedCredits: number;
  inProgressCredits: number;
  remainingCredits: number;
  percentDone: number;
  remainingCourseCount: number;
};

/**
 * Treats every non-archived course the student has entered (regardless of status) as their
 * full degree plan — this app's whole premise is that the student's course list *is* their
 * major sheet, so "total required" per category is just "every course they've listed there."
 */
export function computeRoadmap(courses: Course[]): Roadmap {
  const active = courses.filter((c) => !c.archived);
  // Prep/foundational courses (0-credit, pre-degree) aren't part of the degree requirement
  // itself, so they're excluded from the roadmap entirely rather than showing as an odd
  // "0/0 credits" category.
  const degreeCategories = CATEGORY_ORDER.filter((c) => c !== "prep");
  const categories: RoadmapCategory[] = degreeCategories.map((category) => {
    const inCat = active.filter((c) => c.category === category);
    const completed = inCat.filter((c) => c.status === "completed");
    const inProgress = inCat.filter((c) => c.status === "current");
    return {
      category,
      totalCredits: inCat.reduce((s, c) => s + (c.credits ?? 0), 0),
      completedCredits: completed.reduce((s, c) => s + (c.credits ?? 0), 0),
      inProgressCredits: inProgress.reduce((s, c) => s + (c.credits ?? 0), 0),
      totalCourses: inCat.length,
      completedCourses: completed.length,
      remaining: inCat.filter((c) => c.status === "future"),
    };
  });

  const totalCredits = categories.reduce((s, c) => s + c.totalCredits, 0);
  const completedCredits = categories.reduce((s, c) => s + c.completedCredits, 0);
  const inProgressCredits = categories.reduce((s, c) => s + c.inProgressCredits, 0);
  const remainingCredits = Math.max(0, totalCredits - completedCredits - inProgressCredits);

  return {
    categories,
    totalCredits,
    completedCredits,
    inProgressCredits,
    remainingCredits,
    percentDone: totalCredits
      ? Math.round(((completedCredits + inProgressCredits) / totalCredits) * 100)
      : 0,
    remainingCourseCount: active.filter((c) => c.status === "future").length,
  };
}

const SEASON_ORDER = ["spring", "summer", "fall"] as const;
type Season = (typeof SEASON_ORDER)[number];

function parseSeasonYear(name: string): { season: Season; year: number } | null {
  const m = name.match(/(spring|summer|fall)\D*(\d{4})/i);
  if (!m) return null;
  return { season: m[1]!.toLowerCase() as Season, year: Number(m[2]) };
}

function nextSeason(
  season: Season,
  year: number,
  skipSummer: boolean,
): { season: Season; year: number } {
  let idx = SEASON_ORDER.indexOf(season);
  do {
    idx = (idx + 1) % SEASON_ORDER.length;
    if (idx === 0) year += 1;
  } while (skipSummer && SEASON_ORDER[idx] === "summer");
  return { season: SEASON_ORDER[idx]!, year };
}

const SEASON_LABEL: Record<Season, { ar: string; en: string }> = {
  spring: { ar: "الربيع", en: "Spring" },
  summer: { ar: "الصيف", en: "Summer" },
  fall: { ar: "الخريف", en: "Fall" },
};

/**
 * Projects which term the student graduates in, given a pace (credits registered per term) and
 * a starting point (their current active term, if its name parses as "<season> <year>"). Summer
 * terms are lighter in most programs, so they're skipped in the projection unless the student's
 * own history shows they actually take courses in summer.
 */
export function estimateGraduation(
  remainingCredits: number,
  creditsPerTerm: number,
  currentTermName: string | null,
  takesSummers: boolean,
  lang: "ar" | "en",
): { termsNeeded: number; label: string | null } {
  const termsNeeded = creditsPerTerm > 0 ? Math.ceil(remainingCredits / creditsPerTerm) : 0;
  if (termsNeeded === 0) return { termsNeeded: 0, label: null };

  const start = currentTermName ? parseSeasonYear(currentTermName) : null;
  if (!start) return { termsNeeded, label: null };

  let cur = start;
  for (let i = 0; i < termsNeeded; i++) cur = nextSeason(cur.season, cur.year, !takesSummers);
  const seasonLabel = lang === "ar" ? SEASON_LABEL[cur.season].ar : SEASON_LABEL[cur.season].en;
  return { termsNeeded, label: `${seasonLabel} ${cur.year}` };
}
