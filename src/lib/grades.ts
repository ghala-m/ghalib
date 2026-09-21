import type { CourseItem } from "@/lib/queries";

export type GradeSummary = {
  /** Sum of weight% across items that carry a grading weight. */
  totalWeight: number;
  /** Sum of weight% across items that also have a score entered. */
  gradedWeight: number;
  /** gradedWeight / totalWeight as 0-100. 0 when nothing is weighted yet. */
  coverage: number;
  /** Weighted average of the student's score across graded items, 0-100. Null until at least one graded item has a score. */
  currentAverage: number | null;
};

/**
 * Computes the student's real running grade in a course from checklist items.
 *
 * Only items with a `weight` count towards the grade (unweighted items, e.g. "read chapter 3",
 * stay informational). Among those, `currentAverage` is the weighted average of the ones the
 * student has entered a `score_percent` for — i.e. "how am I doing on what's been graded so far",
 * not a prediction for items that haven't been graded yet.
 */
export function summarizeGrades(
  items: Pick<CourseItem, "weight" | "score_percent">[],
): GradeSummary {
  const weighted = items.filter((i) => i.weight != null && i.weight > 0);
  const totalWeight = weighted.reduce((sum, i) => sum + (i.weight ?? 0), 0);

  const graded = weighted.filter((i) => i.score_percent != null);
  const gradedWeight = graded.reduce((sum, i) => sum + (i.weight ?? 0), 0);

  const currentAverage =
    gradedWeight > 0
      ? graded.reduce((sum, i) => sum + (i.weight ?? 0) * (i.score_percent ?? 0), 0) / gradedWeight
      : null;

  return {
    totalWeight,
    gradedWeight,
    coverage: totalWeight > 0 ? (gradedWeight / totalWeight) * 100 : 0,
    currentAverage,
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
