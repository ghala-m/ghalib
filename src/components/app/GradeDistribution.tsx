import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Weight = { id: string; category: string; percentage: number | string };

/**
 * Shades of the student's theme colour (Settings → colours): the biggest category is the strongest
 * tint, smaller ones fade — so the chart always matches the app instead of introducing new hues.
 */
const SHADES = [
  { bar: "bg-accent", soft: "bg-accent/25 text-foreground" },
  { bar: "bg-accent/80", soft: "bg-accent/20 text-foreground" },
  { bar: "bg-accent/65", soft: "bg-accent/15 text-foreground" },
  { bar: "bg-accent/50", soft: "bg-accent/15 text-foreground" },
  { bar: "bg-accent/40", soft: "bg-accent/10 text-foreground" },
  { bar: "bg-accent/30", soft: "bg-accent/10 text-foreground" },
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
        .map((r, i) => ({ ...r, color: SHADES[Math.min(i, SHADES.length - 1)]! })),
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
              balanced ? "bg-accent/20 text-foreground" : "bg-destructive/15 text-destructive",
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
