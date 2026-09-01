import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseMajorSheet, type MajorSheet } from "@/lib/majorsheet.functions";
import { ACCEPTED_DOCS, isAcceptedDoc, prepareDocument } from "@/lib/files";
import { CATEGORY_META, CATEGORY_ORDER, diffMajorSheet, unresolvedPrerequisites, type ReimportRow } from "@/lib/plan";
import { coursesQuery, type CourseCategory } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LangToggle } from "@/components/LangToggle";
import { ThemeModeToggle } from "@/components/app/ThemeControls";

export const Route = createFileRoute("/_authenticated/reimport-plan")({
  component: ReimportPlanPage,
});

function rowKey(row: ReimportRow) {
  return row.kind === "new" ? `new-${row.parsed.code || row.parsed.name}` : `changed-${row.existing.id}`;
}

function ReimportPlanPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const parse = useServerFn(parseMajorSheet);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: courses = [] } = useQuery(coursesQuery());

  const [sheet, setSheet] = useState<MajorSheet | null>(null);
  const [diff, setDiff] = useState<{ rows: ReimportRow[]; unchangedCount: number } | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [categoryOverride, setCategoryOverride] = useState<Record<string, CourseCategory>>({});

  const run = useMutation({
    mutationFn: async (file: File) => {
      if (!isAcceptedDoc(file)) throw new Error("INVALID_FILE");
      const doc = await prepareDocument(file);
      const payload = doc.kind === "pdf" ? { base64: doc.base64, mediaType: doc.mediaType } : { text: doc.text };
      return (await parse({ data: payload })) as MajorSheet;
    },
    onSuccess: (data) => {
      const result = diffMajorSheet(courses, data.courses);
      setSheet(data);
      setDiff(result);
      const initial: Record<string, boolean> = {};
      for (const row of result.rows) initial[rowKey(row)] = row.kind === "new";
      setSelected(initial);
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

  const apply = useMutation({
    mutationFn: async () => {
      if (!user || !diff) return;
      const toInsert = diff.rows
        .filter((r): r is Extract<ReimportRow, { kind: "new" }> => r.kind === "new" && selected[rowKey(r)])
        .map((r) => ({
          user_id: user.id,
          name: r.parsed.name,
          code: r.parsed.code,
          credits: r.parsed.credits,
          category: categoryOverride[rowKey(r)] ?? r.parsed.category,
          prerequisites: r.parsed.prerequisites,
          plan_level: r.parsed.level,
          status: "future" as const,
        }));

      const toUpdate = diff.rows.filter(
        (r): r is Extract<ReimportRow, { kind: "changed" }> => r.kind === "changed" && selected[rowKey(r)],
      );

      if (toInsert.length) {
        const { error } = await supabase.from("courses").insert(toInsert);
        if (error) throw error;
      }
      for (const r of toUpdate) {
        const { error } = await supabase
          .from("courses")
          .update({
            credits: r.parsed.credits,
            category: categoryOverride[rowKey(r)] ?? r.parsed.category,
            plan_level: r.parsed.level,
            prerequisites: r.parsed.prerequisites,
          })
          .eq("id", r.existing.id);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast.success(t("reimportApplied"));
      navigate({ to: "/dashboard" });
    },
    onError: () => toast.error(t("reimportApplyFailed")),
  });

  const newRows = useMemo(() => diff?.rows.filter((r) => r.kind === "new") ?? [], [diff]);
  const changedRows = useMemo(() => diff?.rows.filter((r) => r.kind === "changed") ?? [], [diff]);
  const unresolved = useMemo(() => (sheet ? unresolvedPrerequisites(sheet.courses) : []), [sheet]);
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allSelected = diff ? diff.rows.length > 0 && diff.rows.every((r) => selected[rowKey(r)]) : false;

  const toggleAll = (checked: boolean) => {
    if (!diff) return;
    const next: Record<string, boolean> = {};
    for (const row of diff.rows) next[rowKey(row)] = checked;
    setSelected(next);
  };

  return (
    <div className="surface-gradient min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/profile" className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" />
              {t("profile")}
            </Link>
            <h1 className="font-display text-2xl font-bold">{t("reimportTitle")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeModeToggle />
            <LangToggle variant="outline" />
          </div>
        </header>

        {!diff && (
          <div className="panel-glass p-8 text-center">
            <Sparkles className="mx-auto size-8 text-accent" />
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">{t("reimportHint")}</p>
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
              {run.isPending ? t("analyzing") : t("reimportUpload")}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">{t("onlyPdfWord")}</p>
          </div>
        )}

        {diff && (
          <div className="space-y-6">
            <div className="panel-glass p-5 text-sm text-muted-foreground">
              {sheet?.major || t("major")}
              {" · "}
              {newRows.length} {t("reimportNewCourses")} · {changedRows.length} {t("reimportChangedCourses")} ·{" "}
              {diff.unchangedCount} {t("reimportUnchanged")}
            </div>

            {unresolved.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">{t("unresolvedPrereqsTitle")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("unresolvedPrereqsHint")}</p>
                <p className="mt-2 font-mono text-xs">{unresolved.join(" · ")}</p>
              </div>
            )}

            {diff.rows.length === 0 ? (
              <div className="panel-glass p-8 text-center text-sm text-muted-foreground">{t("reimportNoDiff")}</div>
            ) : (
              <>
                {newRows.length > 0 && (
                  <div className="panel-glass overflow-hidden">
                    <div className="border-b border-border px-5 py-3 text-sm font-semibold">{t("reimportNewCourses")}</div>
                    <ul className="divide-y divide-border">
                      {newRows.map((row) => {
                        if (row.kind !== "new") return null;
                        const key = rowKey(row);
                        return (
                          <li key={key} className="flex flex-wrap items-center gap-3 px-5 py-3">
                            <Checkbox
                              checked={!!selected[key]}
                              onCheckedChange={(v) => setSelected((s) => ({ ...s, [key]: !!v }))}
                            />
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ background: CATEGORY_META[categoryOverride[key] ?? row.parsed.category].color }}
                            />
                            <div className="min-w-40 flex-1">
                              <p className="text-sm font-medium">{row.parsed.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.parsed.code || "—"} · {row.parsed.credits ?? "—"}
                              </p>
                            </div>
                            <Select
                              value={categoryOverride[key] ?? row.parsed.category}
                              onValueChange={(v) => setCategoryOverride((s) => ({ ...s, [key]: v as CourseCategory }))}
                            >
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
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {changedRows.length > 0 && (
                  <div className="panel-glass overflow-hidden">
                    <div className="border-b border-border px-5 py-3 text-sm font-semibold">{t("reimportChangedCourses")}</div>
                    <ul className="divide-y divide-border">
                      {changedRows.map((row) => {
                        if (row.kind !== "changed") return null;
                        const key = rowKey(row);
                        return (
                          <li key={key} className="flex flex-wrap items-center gap-3 px-5 py-3">
                            <Checkbox
                              checked={!!selected[key]}
                              onCheckedChange={(v) => setSelected((s) => ({ ...s, [key]: !!v }))}
                            />
                            <div className="min-w-40 flex-1">
                              <p className="text-sm font-medium">{row.parsed.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.parsed.code || "—"} ·{" "}
                                {row.changes.includes("credits") &&
                                  `${t("credits")}: ${row.existing.credits ?? "—"} → ${row.parsed.credits ?? "—"} `}
                                {row.changes.includes("category") &&
                                  `${t("category")}: ${t(CATEGORY_META[row.existing.category].key)} → ${t(CATEGORY_META[row.parsed.category].key)} `}
                                {row.changes.includes("level") &&
                                  `${t("reimportLevelWas")}: ${row.existing.plan_level ?? "—"} → ${row.parsed.level ?? "—"} `}
                                {row.changes.includes("prerequisites") &&
                                  `${t("reimportPrereqsWas")}: ${row.existing.prerequisites.join(", ") || "—"} → ${row.parsed.prerequisites.join(", ") || "—"}`}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button disabled={apply.isPending || selectedCount === 0} onClick={() => apply.mutate()}>
                    {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    {t("reimportApply")} ({selectedCount})
                  </Button>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
                    {t("reimportSelectAll")}
                  </label>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
