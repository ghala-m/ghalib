import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calculator, TrendingDown, TrendingUp } from "lucide-react";
import { coursesQuery } from "@/lib/queries";
import { completedGpa, nearestGradeAtLeast, requiredAverage, simulateGpa } from "@/lib/gpa";
import { GRADE_SCALE } from "@/lib/plan";
import { useI18n } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeModeToggle } from "@/components/app/ThemeControls";
import { LangToggle } from "@/components/LangToggle";

export const Route = createFileRoute("/_authenticated/gpa-planner")({
  head: () => ({
    meta: [
      { title: "GPA Planner — Ghalib" },
      { name: "description", content: "Simulate hypothetical grades and see their effect on your overall GPA before they're final." },
    ],
  }),
  component: GpaPlannerPage,
});

function GpaPlannerPage() {
  const { t } = useI18n();
  const { data: courses = [] } = useQuery(coursesQuery());
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  // Persisted across page navigation — re-deriving a target every visit was the exact
  // frustration being fixed here, since this is meant to be a "keep checking in on my goal"
  // tool, not a one-shot calculator.
  const [targetGpa, setTargetGpa] = useState(() => (typeof window !== "undefined" && localStorage.getItem("ghalib.targetGpa")) || "3.5");
  const [remainingCredits, setRemainingCredits] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("ghalib.targetRemainingCredits") : null,
  );

  useEffect(() => {
    localStorage.setItem("ghalib.targetGpa", targetGpa);
  }, [targetGpa]);

  useEffect(() => {
    if (remainingCredits === null) localStorage.removeItem("ghalib.targetRemainingCredits");
    else localStorage.setItem("ghalib.targetRemainingCredits", remainingCredits);
  }, [remainingCredits]);

  const active = courses.filter((c) => !c.archived);
  const completed = active.filter((c) => c.status === "completed");
  const currentTerm = active.filter((c) => c.status === "current");

  const base = useMemo(() => completedGpa(completed), [completed]);
  // Only *this term's* courses are simulated — future-plan courses don't have real grades to
  // guess at yet, and including them made the projection noisy and less actionable.
  const projected = useMemo(() => simulateGpa(base, currentTerm, overrides), [base, currentTerm, overrides]);

  const defaultRemaining = currentTerm.reduce((s, c) => s + (c.credits ?? 3), 0);
  const remaining = remainingCredits === null ? defaultRemaining : Number(remainingCredits) || 0;

  const required = requiredAverage(base, remaining, Number(targetGpa) || 0);
  const requiredLetter = required !== null ? nearestGradeAtLeast(required) : null;

  const delta = base.gpa !== null && projected.gpa !== null ? projected.gpa - base.gpa : null;

  return (
    <div className="surface-gradient min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display flex items-center gap-2 text-3xl font-bold">
              <Calculator className="size-7 text-accent" />
              {t("gpaPlanner")}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t("gpaPlannerHint")}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeModeToggle />
            <LangToggle variant="outline" />
          </div>
        </header>

        {base.credits === 0 ? (
          <p className="panel p-8 text-center text-sm text-muted-foreground">{t("noCompletedCourses")}</p>
        ) : (
          <>
            {/* Current vs projected summary */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="panel p-5">
                <p className="text-xs text-muted-foreground">{t("currentGpaLabel")}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{base.gpa?.toFixed(2) ?? "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {base.credits} {t("credits")}
                </p>
              </div>
              <div className="panel p-5">
                <p className="text-xs text-muted-foreground">{t("projectedGpaLabel")}</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-3xl font-bold tabular-nums text-accent">{projected.gpa?.toFixed(2) ?? "—"}</p>
                  {delta !== null && Math.abs(delta) >= 0.005 && (
                    <span
                      className={
                        "flex items-center gap-0.5 text-sm font-medium " + (delta > 0 ? "text-cat-general" : "text-destructive")
                      }
                    >
                      {delta > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {projected.credits} {t("credits")}
                </p>
              </div>
            </div>

            {/* Simulate specific courses */}
            <section className="panel mt-6 overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="font-semibold">{t("simulateSection")}</p>
              </div>
              {currentTerm.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">{t("noRemainingCourses")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {currentTerm.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-40 flex-1">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.code || "—"} · {c.credits ?? 3} {t("credits")} · {t(c.status)}
                        </p>
                      </div>
                      <Select
                        value={overrides[c.id] ?? "__none"}
                        onValueChange={(v) =>
                          setOverrides((s) => {
                            const next = { ...s };
                            if (v === "__none") delete next[c.id];
                            else next[c.id] = v;
                            return next;
                          })
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">—</SelectItem>
                          {GRADE_SCALE.map((g) => (
                            <SelectItem key={g.grade} value={g.grade}>
                              {g.grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Target GPA solver */}
            <section className="panel mt-6 p-5">
              <p className="font-semibold">{t("targetSection")}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("targetGpaLabel")}</Label>
                  <Input type="number" min={0} max={4} step="0.01" value={targetGpa} onChange={(e) => setTargetGpa(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("remainingCreditsLabel")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={remainingCredits ?? String(defaultRemaining)}
                    onChange={(e) => setRemainingCredits(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                {remaining <= 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noRemainingCourses")}</p>
                ) : required === null ? null : required <= 0 ? (
                  <p className="text-sm text-cat-general">{t("targetAlreadyMet")}</p>
                ) : required > 4 ? (
                  <p className="text-sm text-destructive">{t("targetImpossible")}</p>
                ) : (
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{t("requiredAverageLabel")}</p>
                    <p className="text-2xl font-bold tabular-nums text-accent">
                      {required.toFixed(2)} {requiredLetter ? <span className="text-base text-muted-foreground">({requiredLetter}+)</span> : null}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
