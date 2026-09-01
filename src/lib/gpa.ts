import { GRADE_SCALE, pointsFor } from "@/lib/plan";
import type { Course } from "@/lib/queries";

export type GpaTotals = { credits: number; points: number; gpa: number | null };

function creditsOf(c: Pick<Course, "credits">) {
  return c.credits ?? 3;
}

/** GPA contribution of already-completed courses, from their stored final grade. This is the
 * one source of truth the What-if tools build on top of — it never touches profile.overall_gpa,
 * so a stale or manually-edited profile value can't throw off the simulation.
 *
 * A course pointed to by another course's `previous_attempt_id` (i.e. it was later retaken) is
 * excluded — only the newer attempt counts, so a retake doesn't get double-counted. */
export function completedGpa(courses: Pick<Course, "id" | "credits" | "final_grade" | "previous_attempt_id">[]): GpaTotals {
  const superseded = new Set(courses.map((c) => c.previous_attempt_id).filter((id): id is string => !!id));
  let credits = 0;
  let points = 0;
  for (const c of courses) {
    if (superseded.has(c.id)) continue;
    const p = pointsFor(c.final_grade);
    if (p === null) continue;
    const cr = creditsOf(c);
    credits += cr;
    points += p * cr;
  }
  return { credits, points, gpa: credits ? points / credits : null };
}

/**
 * Projects the overall GPA if the given hypothetical letter grades were earned in the listed
 * (not-yet-completed) courses, added on top of `base` (already-completed work).
 * `overrides` maps course id -> letter grade; courses without an entry are left out of the projection.
 */
export function simulateGpa(
  base: GpaTotals,
  courses: Pick<Course, "id" | "credits">[],
  overrides: Record<string, string>,
): GpaTotals & { simulatedCredits: number } {
  let credits = base.credits;
  let points = base.points;
  let simulatedCredits = 0;
  for (const c of courses) {
    const grade = overrides[c.id];
    if (!grade) continue;
    const p = pointsFor(grade);
    if (p === null) continue;
    const cr = creditsOf(c);
    credits += cr;
    points += p * cr;
    simulatedCredits += cr;
  }
  return { credits, points, gpa: credits ? points / credits : null, simulatedCredits };
}

/**
 * Reverse-solves: given a target overall GPA and a pool of remaining credits, what average
 * grade-points do those remaining credits need to earn to hit the target? Returns null when
 * there are no remaining credits to solve for.
 */
export function requiredAverage(base: GpaTotals, remainingCredits: number, targetGpa: number): number | null {
  if (remainingCredits <= 0) return null;
  const neededPoints = targetGpa * (base.credits + remainingCredits) - base.points;
  return neededPoints / remainingCredits;
}

/** Maps a required grade-point average to the lowest letter grade that clears it, for an
 * intuitive read (e.g. "you need at least a B+ average"). Null when the average exceeds 4.0
 * (mathematically unreachable with a standard scale). */
export function nearestGradeAtLeast(points: number): string | null {
  if (points > 4) return null;
  const ascending = [...GRADE_SCALE].sort((a, b) => a.points - b.points);
  return ascending.find((g) => g.points >= points)?.grade ?? "F";
}
