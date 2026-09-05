import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, FlaskConical, Sparkles, X } from "lucide-react";
import { buildPrereqGraph, bestCombination, simulateUnlocks, CATEGORY_META } from "@/lib/plan";
import { blockedByAlternative, coursesQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/simulator")({
  head: () => ({
    meta: [{ title: "Registration simulator — Ghalib" }],
  }),
  component: SimulatorPage,
});

function SimulatorPage() {
  const { t, dir } = useI18n();
  const { data: courses = [] } = useQuery(coursesQuery());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [maxCredits, setMaxCredits] = useState<string>("");

  // Candidates: future courses registerable today (same "available" definition as the flow chart).
  const candidates = useMemo(() => {
    const { nodes } = buildPrereqGraph(courses);
    return nodes
      .filter((n) => n.state === "available")
      .map((n) => n.course)
      .filter((c) => !blockedByAlternative(c, courses));
  }, [courses]);

  const unlocks = useMemo(() => simulateUnlocks(courses, [...selected]), [courses, selected]);

  // Per-candidate marginal unlock count, for the badge on each chip.
  const marginal = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of candidates) {
      const withC = simulateUnlocks(courses, [...selected, c.id]).length;
      map.set(c.id, withC - unlocks.length);
    }
    return map;
  }, [candidates, courses, selected, unlocks.length]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const suggest = () => {
    const limit = maxCredits.trim() === "" ? null : Math.max(0, Number(maxCredits) || 0);
    const { picked } = bestCombination(courses, candidates, limit);
    setSelected(new Set(picked.map((p) => p.id)));
  };

  const selectedCourses = candidates.filter((c) => selected.has(c.id));
  const totalCredits = selectedCourses.reduce((s, c) => s + (c.credits ?? 0), 0);

  return (
    <div dir={dir} className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <FlaskConical className="size-6 text-accent" />
          {t("simulator")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("simHint")}</p>
      </header>

      {/* Best combination suggester */}
      <div className="panel mb-6 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-accent" />
          {t("simBestTitle")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("simBestHint")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={maxCredits}
            onChange={(e) => setMaxCredits(e.target.value)}
            placeholder={t("simNoLimit")}
            className="w-36"
            aria-label={t("simMaxCredits")}
          />
          <span className="text-xs text-muted-foreground">{t("simMaxCredits")}</span>
          <Button onClick={suggest} disabled={!candidates.length}>
            <Sparkles className="size-4" />
            {t("simSuggest")}
          </Button>
        </div>
      </div>

      {/* Candidate chips */}
      <div className="panel mb-6 p-4 sm:p-5">
        <h2 className="font-semibold">{t("simAvailableToPick")}</h2>
        {candidates.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("simNoAvailable")}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {candidates.map((c) => {
              const active = selected.has(c.id);
              const gain = marginal.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active ? "border-accent bg-accent/10 font-medium" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <i className="size-2 rounded-full" style={{ background: CATEGORY_META[c.category].color }} />
                    <span className="max-w-48 truncate">{c.name}</span>
                    {c.credits ? <span className="text-xs text-muted-foreground">{c.credits}</span> : null}
                    {!active && gain > 0 ? (
                      <span className="rounded-full bg-accent/15 px-1.5 text-xs text-accent">+{gain}</span>
                    ) : null}
                    {active ? <Check className="size-3.5 text-accent" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Selection summary + unlocks */}
      <div className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{t("simSelected")}</h2>
          {selectedCourses.length ? (
            <p className="text-xs text-muted-foreground">
              {selectedCourses.length} · {totalCredits} {t("simCredits")}
            </p>
          ) : null}
        </div>

        {selectedCourses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("simNothingYet")}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {selectedCourses.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-sm">
                <span className="max-w-40 truncate">{c.code || c.name}</span>
                <button type="button" onClick={() => toggle(c.id)} aria-label={c.name} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">
            {t("simUnlocks")}
            {unlocks.length ? (
              <span className="ms-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                {unlocks.length} {t("simUnlockCount")}
              </span>
            ) : null}
          </h3>
          {selectedCourses.length > 0 && unlocks.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("simNoUnlocks")}</p>
          ) : null}
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {unlocks.map((c) => (
              <li key={c.id}>
                <Link
                  to="/courses/$courseId"
                  params={{ courseId: c.id }}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <i className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_META[c.category].color }} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{c.code || "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
