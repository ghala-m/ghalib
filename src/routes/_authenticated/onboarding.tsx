import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseMajorSheet, type MajorSheet, type PlanCourse } from "@/lib/majorsheet.functions";
import { ACCEPTED_DOCS, isAcceptedDoc, prepareDocument } from "@/lib/files";
import { CATEGORY_META, CATEGORY_ORDER, GRADE_SCALE, pointsFor, unresolvedPrerequisites } from "@/lib/plan";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LangToggle } from "@/components/LangToggle";
import { ThemeModeToggle } from "@/components/app/ThemeControls";
import type { CourseCategory, CourseStatus } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your study plan — Ghalib" },
      { name: "description", content: "Upload your major sheet and let Ghalib build your degree plan automatically." },
      { property: "og:title", content: "Set up your study plan — Ghalib" },
      { property: "og:description", content: "Upload your major sheet and let Ghalib build your degree plan automatically." },
    ],
  }),
  component: OnboardingPage,
});

type Row = PlanCourse & { status: CourseStatus; grade: string; completedTerm: string };

function OnboardingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const parse = useServerFn(parseMajorSheet);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<MajorSheet | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Autosave: parsing the major sheet is a real AI cost, so losing that work to an accidental
  // refresh or closed tab before the final "save" click would be wasteful and frustrating.
  const draftKey = user ? `ghalib:onboarding-draft:${user.id}` : null;

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { sheet: MajorSheet; rows: Row[]; stage: 1 | 2 | 3 };
      if (draft.sheet && draft.rows?.length) {
        setSheet(draft.sheet);
        setRows(draft.rows);
        setStage(draft.stage ?? 2);
        setRestoredDraft(true);
      }
    } catch {
      // corrupted draft — ignore and start fresh rather than crash onboarding
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !sheet) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ sheet, rows, stage }));
    } catch {
      // storage full/unavailable — autosave is a nice-to-have, not worth surfacing an error for
    }
  }, [draftKey, sheet, rows, stage]);

  const clearDraft = () => {
    if (draftKey) localStorage.removeItem(draftKey);
  };

  const run = useMutation({
    mutationFn: async (file: File) => {
      if (!isAcceptedDoc(file)) throw new Error("INVALID_FILE");
      const doc = await prepareDocument(file);
      const payload = doc.kind === "pdf" ? { base64: doc.base64, mediaType: doc.mediaType } : { text: doc.text };
      return (await parse({ data: payload })) as MajorSheet;
    },
    onSuccess: (data) => {
      setSheet(data);
      setRows(data.courses.map((c) => ({ ...c, status: "future" as CourseStatus, grade: "", completedTerm: "" })));
      setStage(2);
    },
    onError: (e: Error) => {
      if (e.message.includes("INVALID_FILE")) toast.error(t("invalidFile"));
      else if (e.message.includes("FILE_TOO_LARGE")) toast.error(t("fileTooLarge"));
      else if (e.message.includes("Missing LOVABLE_API_KEY")) toast.error(t("aiKeyMissing"));
      else if (e.message.includes("RATE_LIMIT")) toast.error(t("aiRateLimit"));
      else if (e.message.includes("NO_CREDITS")) toast.error(t("aiCredits"));
      else toast.error(t("aiFailed"));
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      const payload = rows.map((r) => ({
        user_id: user.id,
        name: r.name,
        code: r.code,
        credits: r.credits,
        category: r.category,
        prerequisites: r.prerequisites,
        plan_level: r.level,
        status: r.status,
        final_grade: r.status === "completed" && r.grade ? r.grade : null,
        grade_points: r.status === "completed" ? pointsFor(r.grade) : null,
        completed_term: r.status === "completed" && r.completedTerm ? r.completedTerm : null,
      }));
      if (payload.length) {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }

      const done = rows.filter((r) => r.status === "completed" && r.credits && pointsFor(r.grade) !== null);
      const credits = done.reduce((s, r) => s + (r.credits ?? 0), 0);
      const gpa = credits ? done.reduce((s, r) => s + (pointsFor(r.grade) ?? 0) * (r.credits ?? 0), 0) / credits : null;

      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          major: sheet?.major ?? null,
          total_credits: credits,
          overall_gpa: gpa ? Number(gpa.toFixed(2)) : null,
        })
        .eq("id", user.id);
      if (pErr) throw pErr;
    },
    onSuccess: async () => {
      await qc.invalidateQueries();
      clearDraft();
      toast.success(t("planSaved"));
      navigate({ to: "/dashboard" });
    },
    onError: () => toast.error(t("saveFailed")),
  });

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const unresolved = useMemo(() => unresolvedPrerequisites(rows), [rows]);

  return (
    <div className="surface-gradient min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">{t("onboarding")}</p>
            <h1 className="font-display text-3xl font-bold">{t("onboardingTitle")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeModeToggle />
            <LangToggle variant="outline" />
          </div>
        </header>

        <ol className="mb-8 flex flex-wrap gap-2 text-xs">
          {[t("stepPlan"), t("stepProgress"), t("stepDone")].map((label, i) => (
            <li
              key={label}
              className={cn(
                "rounded-full border px-3 py-1",
                stage >= i + 1 ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground",
              )}
            >
              {t("step")} {i + 1} · {label}
            </li>
          ))}
        </ol>

        {restoredDraft && stage !== 1 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 text-xs">
            <span>{t("draftRestored")}</span>
            <button
              type="button"
              className="font-medium text-accent hover:underline"
              onClick={() => {
                clearDraft();
                setSheet(null);
                setRows([]);
                setStage(1);
                setRestoredDraft(false);
              }}
            >
              {t("discardDraft")}
            </button>
          </div>
        )}

        {stage === 1 && (
          <div className="panel-glass p-8 text-center">
            <Sparkles className="mx-auto size-8 text-accent" />
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">{t("onboardingBody")}</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_DOCS}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) run.mutate(file);
                e.target.value = "";
              }}
            />
            <Button className="mt-6" size="lg" disabled={run.isPending} onClick={() => inputRef.current?.click()}>
              {run.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {run.isPending ? t("analyzing") : t("uploadMajorSheet")}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">{t("onlyPdfWord")}</p>
          </div>
        )}

        {stage >= 2 && (
          <div className="space-y-6">
            <div className="panel-glass p-5">
              <p className="text-sm font-medium">
                {sheet?.major || t("major")}
                {sheet?.university ? ` · ${sheet.university}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {rows.length} {t("coursesFound")}
              </p>
            </div>

            {unresolved.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">{t("unresolvedPrereqsTitle")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("unresolvedPrereqsHint")}</p>
                <p className="mt-2 font-mono text-xs">{unresolved.join(" · ")}</p>
              </div>
            )}

            <div className="panel-glass overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="font-semibold">{stage === 2 ? t("reviewPlanTitle") : t("markProgressTitle")}</p>
                <p className="text-xs text-muted-foreground">{stage === 2 ? t("reviewPlanHint") : t("markProgressHint")}</p>
              </div>
              <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto">
                {rows.map((r, i) => (
                  <li key={`${r.code}-${i}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: CATEGORY_META[r.category].color }}
                    />
                    <div className="min-w-40 flex-1">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.code || "—"} · {r.credits ?? "—"} · {t(CATEGORY_META[r.category].key)}
                        {r.prerequisites.length ? ` · ${t("prerequisites")}: ${r.prerequisites.join(", ")}` : ""}
                      </p>
                    </div>

                    {stage === 2 ? (
                      <Select value={r.category} onValueChange={(v) => update(i, { category: v as CourseCategory })}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_ORDER.map((c) => (
                            <SelectItem key={c} value={c}>
                              {t(CATEGORY_META[c].key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select value={r.status} onValueChange={(v) => update(i, { status: v as CourseStatus })}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="future">{t("future")}</SelectItem>
                            <SelectItem value="current">{t("current")}</SelectItem>
                            <SelectItem value="completed">{t("completed")}</SelectItem>
                          </SelectContent>
                        </Select>
                        {r.status === "completed" && (
                          <>
                            <Select value={r.grade} onValueChange={(v) => update(i, { grade: v })}>
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder={t("grade")} />
                              </SelectTrigger>
                              <SelectContent>
                                {GRADE_SCALE.map((g) => (
                                  <SelectItem key={g.grade} value={g.grade}>
                                    {g.grade}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={r.completedTerm}
                              onChange={(e) => update(i, { completedTerm: e.target.value })}
                              placeholder={t("completedTerm")}
                              className="w-40"
                            />
                          </>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {stage === 2 ? (
                <Button onClick={() => setStage(3)}>{t("markProgressTitle")}</Button>
              ) : (
                <Button disabled={save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("finishSetup")}
                </Button>
              )}
              <Button variant="outline" onClick={() => (stage === 3 ? setStage(2) : setStage(1))}>
                {t("cancel")}
              </Button>
              <label className="ms-auto flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={rows.every((r) => r.status === "completed")}
                  onCheckedChange={(v) =>
                    setRows((rs) => rs.map((r) => ({ ...r, status: v ? ("completed" as CourseStatus) : ("future" as CourseStatus) })))
                  }
                />
                {t("completed")}
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
