import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, Award, Download, GraduationCap, Loader2, Printer } from "lucide-react";
import { coursesQuery, profileQuery, termsQuery, type Course, type TermRow } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { exportElementToPdf } from "@/lib/export-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transcript")({
  head: () => ({
    meta: [
      { title: "Transcript — Ghalib" },
      {
        name: "description",
        content: "Your full academic transcript, term by term, ready to print or save as a PDF.",
      },
    ],
  }),
  component: TranscriptPage,
});

/** Academic year label from a term's start date (Aug+ starts a new academic year). */
function academicYearOf(startDate: string | null): string {
  if (!startDate) return "—";
  const d = new Date(startDate);
  const y = d.getFullYear();
  return d.getMonth() >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

type TermGroup = {
  term: TermRow | null;
  label: string;
  academicYear: string;
  courses: Course[];
  semCh: number;
  semGpa: number | null;
  accumCh: number;
  accumPoints: number;
  cgpa: number | null;
};

function TranscriptPage() {
  const { t, lang, dir } = useI18n();
  const { user } = useAuth();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: courses = [] } = useQuery(coursesQuery());
  const { data: terms = [] } = useQuery(termsQuery());

  const today = new Date().toLocaleDateString(lang === "ar" ? "ar" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const groups = useMemo<TermGroup[]>(() => {
    const completed = courses.filter((c) => c.status === "completed" && !c.archived);

    const sortedTerms = [...terms].sort((a, b) => {
      if (a.start_date && b.start_date) return a.start_date.localeCompare(b.start_date);
      return a.term_number - b.term_number;
    });

    const byTermName = new Map<string, Course[]>();
    for (const c of completed) {
      const key = c.completed_term || c.term || "";
      const list = byTermName.get(key) ?? [];
      list.push(c);
      byTermName.set(key, list);
    }

    const rows: TermGroup[] = [];
    let accumCh = 0;
    let accumPoints = 0;

    for (const term of sortedTerms) {
      const list = (byTermName.get(term.name) ?? []).sort((a, b) =>
        (a.code || a.name).localeCompare(b.code || b.name),
      );
      byTermName.delete(term.name);
      const semCh = term.credits ?? list.reduce((s, c) => s + (c.credits ?? 0), 0);
      const semPoints = list.reduce((s, c) => s + (c.grade_points ?? 0) * (c.credits ?? 0), 0);
      accumCh += semCh;
      accumPoints += term.gpa != null ? term.gpa * semCh : semPoints;
      rows.push({
        term,
        label: term.name,
        academicYear: academicYearOf(term.start_date),
        courses: list,
        semCh,
        semGpa: term.gpa ?? (semCh ? semPoints / semCh : null),
        accumCh,
        accumPoints,
        cgpa: accumCh ? accumPoints / accumCh : null,
      });
    }

    // Any completed courses whose recorded term text didn't match a `terms` row (e.g. imported
    // history) still belong on the transcript — grouped by that raw text instead of being dropped.
    for (const [label, list] of byTermName) {
      if (!list.length) continue;
      const sorted = list.sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));
      const semCh = sorted.reduce((s, c) => s + (c.credits ?? 0), 0);
      const semPoints = sorted.reduce((s, c) => s + (c.grade_points ?? 0) * (c.credits ?? 0), 0);
      accumCh += semCh;
      accumPoints += semPoints;
      rows.push({
        term: null,
        label: label || t("noTerm"),
        academicYear: "—",
        courses: sorted,
        semCh,
        semGpa: semCh ? semPoints / semCh : null,
        accumCh,
        accumPoints,
        cgpa: accumCh ? accumPoints / accumCh : null,
      });
    }

    return rows;
  }, [courses, terms, t]);

  const byYear = useMemo(() => {
    const map = new Map<string, TermGroup[]>();
    for (const g of groups) {
      const list = map.get(g.academicYear) ?? [];
      list.push(g);
      map.set(g.academicYear, list);
    }
    return [...map.entries()];
  }, [groups]);

  const finalCgpa = groups.length
    ? groups[groups.length - 1]!.cgpa
    : (profile?.overall_gpa ?? null);
  const finalCredits = groups.length
    ? groups[groups.length - 1]!.accumCh
    : (profile?.total_credits ?? 0);

  const contentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    if (!contentRef.current) return;
    setDownloading(true);
    try {
      await exportElementToPdf(contentRef.current, "transcript.pdf");
    } catch {
      toast.error(t("pdfExportFailed"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      dir={dir}
      className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 print:max-w-none print:px-0 print:py-0"
    >
      <div className="print-hide mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4 rtl:rotate-180" />
          {t("backToProfile")}
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            {t("printAction")}
          </Button>
          <Button onClick={download} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {t("downloadPdf")}
          </Button>
        </div>
      </div>

      <div ref={contentRef}>
        {/* Header */}
        <header className="print-panel panel mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
                <GraduationCap className="size-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">{t("transcriptTitle")}</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.full_name || user?.email} · {profile?.major || t("none")}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("generatedOn")} {today}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
            <SummaryStat label={t("cgpa")} value={finalCgpa?.toFixed(3) ?? "—"} highlight />
            <SummaryStat label={t("totalCredits")} value={String(finalCredits)} />
            <SummaryStat label={t("termsCompleted")} value={String(groups.length)} />
            <SummaryStat
              label={t("accumPoint")}
              value={groups.length ? groups[groups.length - 1]!.accumPoints.toFixed(3) : "0.000"}
            />
          </div>
        </header>

        {!groups.length ? (
          <div className="panel flex flex-col items-center gap-3 p-10 text-center">
            <Award className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("transcriptEmpty")}</p>
          </div>
        ) : (
          byYear.map(([year, yearGroups]) => (
            <section key={year} className="mb-8">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                <span className="h-5 w-1.5 rounded-full bg-accent" />
                {year}
              </h2>
              <div className="space-y-5">
                {yearGroups.map((g) => (
                  <TermCard key={g.term?.id ?? g.label} group={g} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-card px-5 py-4 text-center">
      <p className={cn("text-2xl font-bold tabular-nums", highlight && "text-accent")}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function gradeTier(grade: string | null): "a" | "b" | "c" | "d" | "f" | "p" | "none" {
  if (!grade) return "none";
  const g = grade.trim().toUpperCase();
  if (g === "P" || g === "PASS") return "p";
  if (g.startsWith("A")) return "a";
  if (g.startsWith("B")) return "b";
  if (g.startsWith("C")) return "c";
  if (g.startsWith("D")) return "d";
  if (g.startsWith("F")) return "f";
  return "none";
}

const GRADE_TIER_STYLE: Record<ReturnType<typeof gradeTier>, string> = {
  a: "bg-cat-general/15 text-cat-general",
  b: "bg-accent/15 text-accent",
  c: "bg-cat-college/20 text-cat-college",
  d: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  f: "bg-destructive/15 text-destructive",
  p: "bg-muted text-muted-foreground",
  none: "bg-muted text-muted-foreground",
};

function TermCard({ group }: { group: TermGroup }) {
  const { t } = useI18n();
  return (
    <div className="print-panel panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-5 py-3">
        <h3 className="font-semibold">{group.label}</h3>
        <span className="text-xs text-muted-foreground">
          {group.courses.length} {t("courses")} · {group.semCh.toFixed(2)} {t("credits")}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-start text-xs text-muted-foreground">
            <Th>{t("courseCode")}</Th>
            <Th>{t("courseName")}</Th>
            <Th align="center">{t("credits")}</Th>
            <Th align="center">{t("grade")}</Th>
          </tr>
        </thead>
        <tbody>
          {group.courses.map((c) => (
            <tr key={c.id} className="border-b border-border/60 last:border-0">
              <Td className="font-mono text-xs text-muted-foreground">{c.code || "—"}</Td>
              <Td className="font-medium">{c.name}</Td>
              <Td align="center" className="tabular-nums">
                {(c.credits ?? 0).toFixed(2)}
              </Td>
              <Td align="center">
                <span
                  className={cn(
                    "inline-flex min-w-10 justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                    GRADE_TIER_STYLE[gradeTier(c.final_grade)],
                  )}
                >
                  {c.final_grade || "—"}
                </span>
              </Td>
            </tr>
          ))}
          {!group.courses.length && (
            <tr>
              <Td className="text-muted-foreground" colSpan={4}>
                {t("noCourses")}
              </Td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-3 border-t border-border bg-muted/20 px-5 py-3 text-xs sm:grid-cols-4">
        <MiniStat label={t("termGpa")} value={group.semGpa?.toFixed(3) ?? "—"} />
        <MiniStat label={t("cgpa")} value={group.cgpa?.toFixed(3) ?? "—"} />
        <MiniStat label={t("semCh")} value={group.semCh.toFixed(2)} />
        <MiniStat label={t("accumCh")} value={group.accumCh.toFixed(2)} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Th({ children, align }: { children: ReactNode; align?: "center" | "start" }) {
  return (
    <th className={cn("px-5 py-2 font-medium", align === "center" && "text-center")}>{children}</th>
  );
}

function Td({
  children,
  className,
  colSpan,
  align,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
  align?: "center" | "start";
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("px-5 py-2", align === "center" && "text-center", className)}
    >
      {children}
    </td>
  );
}
