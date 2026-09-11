import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { GraduationCap, Minus, Plus, Route as RouteIcon } from "lucide-react";
import { coursesQuery, termsQuery } from "@/lib/queries";
import { computeRoadmap, estimateGraduation } from "@/lib/roadmap";
import { CATEGORY_META } from "@/lib/plan";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Graduation roadmap — Ghalib" },
      {
        name: "description",
        content: "What's left to graduate, broken down by requirement, and when you'll finish.",
      },
    ],
  }),
  component: RoadmapPage,
});

const PACE_KEY = "ghalib.roadmapPace";

function RoadmapPage() {
  const { t, lang, dir } = useI18n();
  const { data: courses = [] } = useQuery(coursesQuery());
  const { data: terms = [] } = useQuery(termsQuery());

  const [pace, setPace] = useState(() => {
    if (typeof window === "undefined") return 15;
    const saved = Number(localStorage.getItem(PACE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 15;
  });
  const setAndStorePace = (v: number) => {
    const next = Math.max(3, Math.min(21, v));
    setPace(next);
    if (typeof window !== "undefined") localStorage.setItem(PACE_KEY, String(next));
  };

  const roadmap = useMemo(() => computeRoadmap(courses), [courses]);
  const activeTerm = terms.find((x) => x.is_active) ?? null;
  const takesSummers = useMemo(() => terms.some((x) => /summer/i.test(x.name)), [terms]);
  const graduation = useMemo(
    () =>
      estimateGraduation(
        roadmap.remainingCredits,
        pace,
        activeTerm?.name ?? null,
        takesSummers,
        lang,
      ),
    [roadmap.remainingCredits, pace, activeTerm, takesSummers, lang],
  );

  return (
    <div dir={dir} className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
          <RouteIcon className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("roadmapTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("roadmapHint")}</p>
        </div>
      </header>

      {!roadmap.totalCredits ? (
        <div className="panel flex flex-col items-center gap-3 p-10 text-center">
          <GraduationCap className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("roadmapEmpty")}</p>
        </div>
      ) : (
        <>
          {/* Overall progress hero */}
          <div className="panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-6 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent px-6 py-6">
              <div className="relative flex size-28 shrink-0 items-center justify-center">
                <svg viewBox="0 0 100 100" className="size-28 -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(roadmap.percentDone / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                  />
                </svg>
                <span className="absolute font-display text-2xl font-bold">
                  {roadmap.percentDone}%
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">{t("roadmapCreditsSoFar")}</p>
                <p className="font-display text-xl font-bold tabular-nums">
                  {roadmap.completedCredits + roadmap.inProgressCredits} / {roadmap.totalCredits}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{t("credits")}</span>
                </p>
                {graduation.termsNeeded > 0 ? (
                  <p className="mt-2 text-sm">
                    {t("roadmapTermsLeft").replace("{n}", String(graduation.termsNeeded))}
                    {graduation.label ? (
                      <>
                        {" — "}
                        <span className="font-semibold text-accent">
                          {t("roadmapEstimatedGrad")} {graduation.label}
                        </span>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-accent">{t("roadmapDone")}</p>
                )}
              </div>
            </div>

            {graduation.termsNeeded > 0 ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-border px-6 py-3 text-sm">
                <span className="text-muted-foreground">{t("roadmapPaceLabel")}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => setAndStorePace(pace - 3)}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-16 text-center tabular-nums">
                    {pace} {t("credits")}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => setAndStorePace(pace + 3)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">{t("roadmapPaceHint")}</span>
              </div>
            ) : null}
          </div>

          {/* Per-category breakdown */}
          <div className="mt-6 space-y-4">
            {roadmap.categories.map((cat) => {
              if (!cat.totalCourses) return null;
              const meta = CATEGORY_META[cat.category];
              const donePct = cat.totalCredits
                ? ((cat.completedCredits + cat.inProgressCredits) / cat.totalCredits) * 100
                : 0;
              return (
                <div key={cat.category} className="panel p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <i
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <h2 className="font-semibold">{t(meta.key)}</h2>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {cat.completedCredits + cat.inProgressCredits} / {cat.totalCredits}{" "}
                      {t("credits")}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${donePct}%`, background: meta.color }}
                    />
                  </div>
                  {cat.remaining.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cat.remaining.slice(0, 8).map((c) => (
                        <Link
                          key={c.id}
                          to="/courses/$courseId"
                          params={{ courseId: c.id }}
                          className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs transition-colors hover:border-accent"
                        >
                          {c.code || c.name}
                        </Link>
                      ))}
                      {cat.remaining.length > 8 ? (
                        <span className="px-2.5 py-1 text-xs text-muted-foreground">
                          +{cat.remaining.length - 8} {t("courses")}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">{t("roadmapCategoryDone")}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
