import type { CourseItem } from "@/lib/queries";

export type GradeSummary = {
  /** Sum of weight% across items that count towards the grade (after any dropped item). */
  totalWeight: number;
  /** Sum of weight% across counted items that also have a score entered. */
  gradedWeight: number;
  /** gradedWeight / totalWeight as 0-100. 0 when nothing is weighted yet. */
  coverage: number;
  /** Weighted average of the student's score across graded items, 0-100. Null until at least one graded item has a score. */
  currentAverage: number | null;
  /** Course points actually earned so far, e.g. 3.75 out of the course's 100. */
  earnedPoints: number;
  /** ids of items excluded by "drop the lowest" (see summarizeGrades). */
  droppedIds: Set<string>;
};

type GradeItem = Pick<CourseItem, "weight" | "score_percent"> & {
  id?: string;
  type?: CourseItem["type"];
  drop_lowest?: boolean | null;
};

/** earned / max → percent (0-100, 2dp). Null when either side is missing or max is 0. */
export function scoreToPercent(
  earned: number | string | null | undefined,
  max: number | string | null | undefined,
): number | null {
  if (earned === "" || earned == null || max === "" || max == null) return null;
  const e = Number(earned);
  const m = Number(max);
  if (!Number.isFinite(e) || !Number.isFinite(m) || m <= 0 || e < 0) return null;
  return Math.round(Math.min(100, (e / m) * 100) * 100) / 100;
}

/** How many of the course's points an item gives: weight% × score%. e.g. 5% × 75% = 3.75. */
export function contribution(
  weight: number | null | undefined,
  percent: number | null | undefined,
): number | null {
  if (!weight || percent == null) return null;
  return (weight * percent) / 100;
}

/**
 * "Drop the lowest": items of the same type that have `drop_lowest` set form a group, and one
 * item per group does not count.
 *  - Once every item in the group has a score, the lowest-scoring one is dropped.
 *  - Until then the dropped slot is held by an ungraded item, so the remaining weight and the
 *    "what do I need" maths already reflect that one quiz will be thrown away.
 * Example: 3 quizzes worth 10 each with drop-lowest → only 20 counts, from the best two.
 */
function findDropped<T extends GradeItem>(weighted: T[]): Set<T> {
  const groups = new Map<string, T[]>();
  for (const i of weighted) {
    if (!i.drop_lowest || !i.type) continue;
    groups.set(i.type, [...(groups.get(i.type) ?? []), i]);
  }
  const dropped = new Set<T>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const ungraded = group.find((i) => i.score_percent == null);
    if (ungraded) {
      dropped.add(ungraded);
    } else {
      const lowest = group.reduce((a, b) =>
        (b.score_percent ?? 0) < (a.score_percent ?? 0) ? b : a,
      );
      dropped.add(lowest);
    }
  }
  return dropped;
}

/**
 * Computes the student's real running grade in a course from checklist items.
 *
 * Only items with a `weight` count towards the grade (unweighted items, e.g. "read chapter 3",
 * stay informational). Among those, `currentAverage` is the weighted average of the ones the
 * student has entered a score for — i.e. "how am I doing on what's been graded so far",
 * not a prediction for items that haven't been graded yet.
 */
export function summarizeGrades(items: GradeItem[]): GradeSummary {
  const weighted = items.filter((i) => i.weight != null && i.weight > 0);
  const dropped = findDropped(weighted);
  const counted = weighted.filter((i) => !dropped.has(i));

  const totalWeight = counted.reduce((sum, i) => sum + (i.weight ?? 0), 0);
  const graded = counted.filter((i) => i.score_percent != null);
  const gradedWeight = graded.reduce((sum, i) => sum + (i.weight ?? 0), 0);
  const earnedPoints = graded.reduce(
    (sum, i) => sum + ((i.weight ?? 0) * (i.score_percent ?? 0)) / 100,
    0,
  );

  const currentAverage =
    gradedWeight > 0
      ? graded.reduce((sum, i) => sum + (i.weight ?? 0) * (i.score_percent ?? 0), 0) / gradedWeight
      : null;

  return {
    totalWeight,
    gradedWeight,
    coverage: totalWeight > 0 ? (gradedWeight / totalWeight) * 100 : 0,
    currentAverage,
    earnedPoints,
    droppedIds: new Set([...dropped].map((i) => i.id).filter((x): x is string => !!x)),
  };
}

/**
 * "What do I need on what's left to hit a target overall grade?" — the classic remaining-average
 * calculator. Only meaningful once some weight is still ungraded; returns null when there's
 * nothing left to affect the outcome (fully graded already) or when the weighting doesn't add up
 * to 100 (can't say what "target%" means against an incomplete weight scheme).
 */
export function neededAverage(summary: GradeSummary, targetPercent: number): number | null {
  const remainingWeight = summary.totalWeight - summary.gradedWeight;
  if (remainingWeight <= 0) return null;
  if (Math.abs(summary.totalWeight - 100) > 0.5) return null;
  const earnedSoFar = (summary.currentAverage ?? 0) * summary.gradedWeight;
  return (targetPercent * 100 - earnedSoFar) / remainingWeight;
}
