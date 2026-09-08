import type { Course, CourseCategory } from "@/lib/queries";
import { blockedByAlternative } from "@/lib/queries";
import type { PlanCourse } from "@/lib/majorsheet.functions";

export const CATEGORY_ORDER: CourseCategory[] = ["general", "college", "major", "major_elective"];

export const CATEGORY_META: Record<
  CourseCategory,
  { key: "general" | "college" | "majorReq" | "major_elective"; color: string }
> = {
  general: { key: "general", color: "var(--cat-general)" },
  college: { key: "college", color: "var(--cat-college)" },
  major: { key: "majorReq", color: "var(--cat-major)" },
  major_elective: { key: "major_elective", color: "var(--cat-major_elective)" },
};

export const GRADE_SCALE: { grade: string; points: number }[] = [
  { grade: "A+", points: 4 },
  { grade: "A", points: 4 },
  { grade: "A-", points: 3.7 },
  { grade: "B+", points: 3.3 },
  { grade: "B", points: 3 },
  { grade: "B-", points: 2.7 },
  { grade: "C+", points: 2.3 },
  { grade: "C", points: 2 },
  { grade: "C-", points: 1.7 },
  { grade: "D+", points: 1.3 },
  { grade: "D", points: 1 },
  { grade: "F", points: 0 },
];

export function pointsFor(grade: string | null) {
  return GRADE_SCALE.find((g) => g.grade === grade)?.points ?? null;
}

export type GraphNode = {
  course: Course;
  key: string;
  depth: number;
  unlocks: string[];
  state: "completed" | "current" | "available" | "locked";
};

export const norm = (v: string) => v.replace(/\s+/g, "").toUpperCase();

/**
 * Capstone 1 has a university-wide unit requirement (96+ completed credit hours) on top of any
 * normal prerequisite courses. There's no dedicated "min credit hours" field in the schema, so
 * this is detected by name/code — matches "Capstone 1", "كابستون 1"/"كابستون ١" (Arabic-Indic or
 * Latin digit), with or without a space before the number.
 */
const CAPSTONE_ONE_PATTERN = /capstone\s*1\b|كابستون\s*[1١]\b/i;
export const CAPSTONE_ONE_MIN_CREDITS = 96;

export function isCapstoneOne(course: Pick<Course, "code" | "name">): boolean {
  return CAPSTONE_ONE_PATTERN.test(course.code ?? "") || CAPSTONE_ONE_PATTERN.test(course.name);
}

/** Sum of credit hours across all courses marked "completed". */
export function completedCreditHours(courses: Course[]): number {
  return courses.reduce((sum, c) => (c.status === "completed" ? sum + (c.credits ?? 0) : sum), 0);
}

/** Whether a course's extra (non-prerequisite-chain) unlock conditions are satisfied — currently just Capstone 1's unit gate. */
export function meetsExtraUnlockConditions(
  course: Pick<Course, "code" | "name">,
  completedCredits: number,
): boolean {
  if (isCapstoneOne(course)) return completedCredits >= CAPSTONE_ONE_MIN_CREDITS;
  return true;
}

/** Builds prerequisite layers: depth = longest prerequisite chain leading to the course. */
export function buildPrereqGraph(courses: Course[]): {
  nodes: GraphNode[];
  byKey: Map<string, GraphNode>;
  maxDepth: number;
} {
  const byKey = new Map<string, GraphNode>();
  const keyOf = (c: Course) => norm(c.code || c.name);

  for (const course of courses) {
    byKey.set(keyOf(course), {
      course,
      key: keyOf(course),
      depth: 0,
      unlocks: [],
      state: "locked",
    });
  }

  const depthOf = (key: string, seen = new Set<string>()): number => {
    const node = byKey.get(key);
    if (!node || seen.has(key)) return 0;
    seen.add(key);
    const prereqs = node.course.prerequisites.map(norm).filter((p) => byKey.has(p));
    if (!prereqs.length) return 0;
    return 1 + Math.max(...prereqs.map((p) => depthOf(p, new Set(seen))));
  };

  for (const node of byKey.values()) {
    node.depth = node.course.plan_level ? node.course.plan_level - 1 : depthOf(node.key);
    for (const p of node.course.prerequisites.map(norm)) {
      byKey.get(p)?.unlocks.push(node.key);
    }
  }

  const totalCompletedCredits = completedCreditHours(courses);
  for (const node of byKey.values()) {
    if (node.course.status === "completed") node.state = "completed";
    else if (node.course.status === "current") node.state = "current";
    else {
      const prereqs = node.course.prerequisites.map(norm).filter((p) => byKey.has(p));
      const prereqsMet = prereqs.every((p) => byKey.get(p)?.course.status === "completed");
      node.state =
        prereqsMet && meetsExtraUnlockConditions(node.course, totalCompletedCredits)
          ? "available"
          : "locked";
    }
  }

  const nodes = [...byKey.values()].sort((a, b) => a.depth - b.depth || a.key.localeCompare(b.key));
  return { nodes, byKey, maxDepth: nodes.reduce((m, n) => Math.max(m, n.depth), 0) };
}

/**
 * Courses that would newly become available to register once the student's *current-term*
 * courses are completed — i.e. still-locked "future" courses whose only unmet prerequisites
 * are courses currently in progress (not yet graded). This is deliberately different from
 * `buildPrereqGraph`'s "available" state, which only counts prerequisites already marked
 * "completed" — that view answers "what can I register for today", this one answers
 * "what opens up once this term ends".
 *
 * Excludes: courses already available today (nothing new to report), and courses blocked by
 * an already-taken alternative-group course (registering for them wouldn't make sense anyway).
 */
export function nextTermPreview(courses: Course[]): Course[] {
  const byKey = new Map<string, Course>();
  for (const c of courses) byKey.set(norm(c.code || c.name), c);
  const totalCompletedCredits = completedCreditHours(courses);

  const result: Course[] = [];
  for (const c of courses) {
    if (c.status !== "future") continue;
    if (!meetsExtraUnlockConditions(c, totalCompletedCredits)) continue;
    const prereqs = c.prerequisites.map(norm).filter((p) => byKey.has(p));
    const availableToday = prereqs.every((p) => byKey.get(p)!.status === "completed");
    if (availableToday) continue;
    const availableNextTerm = prereqs.every((p) => {
      const status = byKey.get(p)!.status;
      return status === "completed" || status === "current";
    });
    if (!availableNextTerm) continue;
    if (blockedByAlternative(c, courses)) continue;
    result.push(c);
  }

  return result.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Registration simulator: assuming the selected courses are completed, which still-locked
 * "future" courses would newly become available? Mirrors `nextTermPreview`'s rules but with
 * an arbitrary assumption set instead of "current courses pass". Excludes courses already
 * available today and courses blocked by a taken alternative-group course.
 */
export function simulateUnlocks(courses: Course[], selectedIds: string[]): Course[] {
  const byKey = new Map<string, Course>();
  for (const c of courses) byKey.set(norm(c.code || c.name), c);
  const assumed = new Set(selectedIds);
  const totalCompletedCredits = completedCreditHours(courses);

  const result: Course[] = [];
  for (const c of courses) {
    if (c.status !== "future" || assumed.has(c.id)) continue;
    if (!meetsExtraUnlockConditions(c, totalCompletedCredits)) continue;
    const prereqs = c.prerequisites.map(norm).filter((p) => byKey.has(p));
    const availableToday = prereqs.every((p) => byKey.get(p)!.status === "completed");
    if (availableToday) continue;
    const unlocked = prereqs.every((p) => {
      const pre = byKey.get(p)!;
      return pre.status === "completed" || assumed.has(pre.id);
    });
    if (!unlocked) continue;
    if (blockedByAlternative(c, courses)) continue;
    result.push(c);
  }

  return result.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Greedy "best combination": from the candidates (courses available to register today),
 * repeatedly pick the one that newly unlocks the most future courses, within an optional
 * credit budget. Stops when nothing with a positive unlock gain fits the budget.
 *
 * Ties (several candidates giving the same unlock gain) are broken *randomly* rather than by a
 * fixed rule, so pressing "suggest" again can surface a different — but equally good — lineup
 * instead of always returning the same one. Pass `avoid` (a list of previously-suggested id
 * sets) to additionally steer away from combinations already shown, when another equally-good
 * option exists.
 */
export function bestCombination(
  courses: Course[],
  candidates: Course[],
  maxCredits: number | null,
  avoid: Set<string>[] = [],
): { picked: Course[]; unlocks: Course[] } {
  const build = (): Course[] => {
    const picked: Course[] = [];
    // Shuffle so tie-breaking order differs between calls (Fisher–Yates).
    const pool = [...candidates];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    let usedCredits = 0;

    for (;;) {
      let bestIdx = -1;
      let bestGain = 0;
      const baseCount = simulateUnlocks(
        courses,
        picked.map((p) => p.id),
      ).length;
      for (let i = 0; i < pool.length; i++) {
        const c = pool[i]!;
        const credits = c.credits ?? 0;
        if (maxCredits != null && usedCredits + credits > maxCredits) continue;
        const gain =
          simulateUnlocks(courses, [...picked.map((p) => p.id), c.id]).length - baseCount;
        // Shuffled pool order means ties are effectively broken at random across calls.
        if (gain > bestGain) {
          bestIdx = i;
          bestGain = gain;
        }
      }
      if (bestIdx < 0 || bestGain <= 0) break;
      const chosen = pool.splice(bestIdx, 1)[0]!;
      picked.push(chosen);
      usedCredits += chosen.credits ?? 0;
    }
    return picked;
  };

  let picked = build();
  const keyOfSet = (list: Course[]) => new Set(list.map((c) => c.id));
  const sameAsAny = (list: Course[]) => {
    const key = keyOfSet(list);
    return avoid.some((prev) => prev.size === key.size && [...prev].every((id) => key.has(id)));
  };
  // If this landed on a combination we've already suggested, retry a handful of times — but
  // only while doing so doesn't sacrifice quality (same total unlock count).
  const targetUnlocks = simulateUnlocks(
    courses,
    picked.map((p) => p.id),
  ).length;
  for (let attempt = 0; attempt < 8 && sameAsAny(picked); attempt++) {
    const retry = build();
    if (
      simulateUnlocks(
        courses,
        retry.map((p) => p.id),
      ).length >= targetUnlocks
    )
      picked = retry;
    else break;
  }

  return {
    picked,
    unlocks: simulateUnlocks(
      courses,
      picked.map((p) => p.id),
    ),
  };
}

export type ReimportRow =
  | { kind: "new"; parsed: PlanCourse }
  | {
      kind: "changed";
      parsed: PlanCourse;
      existing: Course;
      changes: ("credits" | "category" | "level" | "prerequisites")[];
    };

/**
 * Compares a freshly re-parsed major sheet against the student's existing courses (matched by
 * normalized course code, falling back to name when a course has no code). Courses that match
 * with no differences are counted but not returned — nothing to review there.
 *
 * Deliberately never suggests deleting anything: a course missing from the new parse just isn't
 * reported, since silently wiping a student's recorded progress/grade on a course would be
 * destructive. Only structural fields (credits/category/level/prerequisites) are ever compared —
 * a student's status, grade, and notes are theirs and this diff never touches them.
 */
export function diffMajorSheet(
  existing: Course[],
  parsed: PlanCourse[],
): { rows: ReimportRow[]; unchangedCount: number } {
  const byKey = new Map<string, Course>();
  for (const c of existing) byKey.set(norm(c.code || c.name), c);

  const rows: ReimportRow[] = [];
  let unchangedCount = 0;

  for (const p of parsed) {
    const match = byKey.get(norm(p.code || p.name));
    if (!match) {
      rows.push({ kind: "new", parsed: p });
      continue;
    }

    const changes: ("credits" | "category" | "level" | "prerequisites")[] = [];
    if ((p.credits ?? null) !== (match.credits ?? null)) changes.push("credits");
    if (p.category !== match.category) changes.push("category");
    if ((p.level ?? null) !== (match.plan_level ?? null)) changes.push("level");
    if (
      [...p.prerequisites].map(norm).sort().join(",") !==
      [...match.prerequisites].map(norm).sort().join(",")
    )
      changes.push("prerequisites");

    if (changes.length === 0) unchangedCount++;
    else rows.push({ kind: "changed", parsed: p, existing: match, changes });
  }

  return { rows, unchangedCount };
}

/**
 * Finds prerequisite codes referenced by any row that don't match any row's own code/name in
 * the same list. The AI extracts both a course's code and its prerequisites' codes from the
 * same document in one pass — if it's even slightly inconsistent between the two (spacing,
 * abbreviation, or a prerequisite for a course outside this major), the match silently fails
 * and that course is stuck "locked" forever with no explanation. This surfaces that instead of
 * hiding it, so the student can fix it (or knowingly ignore it) right after import.
 */
export function unresolvedPrerequisites(
  rows: { code: string | null; name: string; prerequisites: string[] }[],
): string[] {
  const known = new Set(rows.map((r) => norm(r.code || r.name)));
  const unresolved = new Set<string>();
  for (const r of rows) {
    for (const p of r.prerequisites) {
      if (!known.has(norm(p))) unresolved.add(p);
    }
  }
  return [...unresolved].sort();
}
