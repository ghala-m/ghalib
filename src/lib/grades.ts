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
export function summarizeGrades(items: Pick<CourseItem, "weight" | "score_percent">[]): GradeSummary {
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
