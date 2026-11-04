import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Weight = { id: string; category: string; percentage: number | string };

/** Distinct, theme-safe hues — one per category so the bar and the list read as one system. */
const PALETTE = [
  { bar: "bg-rose-500", soft: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
  { bar: "bg-sky-500", soft: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  { bar: "bg-amber-500", soft: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  { bar: "bg-emerald-500", soft: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  { bar: "bg-violet-500", soft: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  { bar: "bg-teal-500", soft: "bg-teal-500/15 text-teal-600 dark:text-teal-300" },
  { bar: "bg-fuchsia-500", soft: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300" },
  { bar: "bg-orange-500", soft: "bg-orange-500/15 text-orange-600 dark:text-orange-300" },
];

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * "Grade distribution" card: a single stacked bar showing how the final grade is split, then one
 * row per category (largest first) with its own bar scaled to the course total — so a 40% final
 * visibly outweighs a 5% participation grade instead of every bar just being a thin pink line.
 */
export function GradeDistribution({ weights }: { weights: Weight[] }) {
  const { t } = useI18n();

  const rows = useMemo(
    () =>
      weights
        .map((w) => ({ id: w.id, category: w.category, value: Number(w.percentage) || 0 }))
        .sort((a, b) => b.value - a.value)
        .map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length]! })),
    [weights],
  );
  const total = rows.reduce((s, r) => s + r.value, 0);
  const balanced = Math.abs(total - 100) <= 0.5;

  return (
    <div className="panel mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{t("gradeWeights")}</h2>
        {rows.length > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
              balanced
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-300",
            )}
          >
            {!balanced && <TriangleAlert className="size-3.5" />}
            {t("gradeTotal")}: {fmt(total)}%
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <>
          {/* stacked overview */}
          <div
            className="mt-5 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={rows.map((r) => `${r.category} ${fmt(r.value)}%`).join(", ")}
          >
            {rows.map((r) => (
              <div
                key={r.id}
                title={`${r.category} · ${fmt(r.value)}%`}
                className={cn("h-full first:rounded-s-full last:rounded-e-full", r.color.bar)}
                style={{ width: `${total > 0 ? (r.value / Math.max(total, 100)) * 100 : 0}%` }}
              />
            ))}
          </div>

          <ul className="mt-5 space-y-4">
            {rows.map((r) => (
              <li key={r.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <span className={cn("size-2.5 shrink-0 rounded-full", r.color.bar)} />
                    <span className="truncate">{r.category}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums",
                      r.color.soft,
                    )}
                  >
                    {fmt(r.value)}%
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className={cn("h-2 rounded-full transition-all", r.color.bar)}
                    style={{ width: `${Math.min(100, r.value)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
