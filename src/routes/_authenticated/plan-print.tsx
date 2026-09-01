import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { coursesQuery, profileQuery } from "@/lib/queries";
import { CATEGORY_ORDER, CATEGORY_META } from "@/lib/plan";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import type { Course, CourseStatus } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/plan-print")({
  head: () => ({
    meta: [{ title: "Academic plan — Ghalib" }],
  }),
  component: PlanPrintPage,
});

const STATUS_ORDER: CourseStatus[] = ["completed", "current", "future"];

function PlanPrintPage() {
  const { t, lang, dir } = useI18n();
  const { user } = useAuth();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: courses = [] } = useQuery(coursesQuery());

  const active = courses.filter((c) => !c.archived);
  const today = new Date().toLocaleDateString(lang === "ar" ? "ar" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div dir={dir} className="mx-auto max-w-4xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
      <div className="print-hide mb-6 flex items-center justify-between gap-3">
        <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-4 rtl:rotate-180" />
          {t("backToProfile")}
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" />
          {t("printOrSave")}
        </Button>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold">{t("planPrintTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.full_name || user?.email} · {profile?.major || t("none")} · {profile?.current_term || t("none")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("generatedOn")} {today}
        </p>
      </header>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <Stat label={t("overallGpa")} value={profile?.overall_gpa ?? "—"} />
        <Stat label={t("semesterGpa")} value={profile?.semester_gpa ?? "—"} />
        <Stat label={t("totalCredits")} value={profile?.total_credits ?? 0} />
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const inCategory = active.filter((c) => c.category === cat);
        if (inCategory.length === 0) return null;
        return (
          <section key={cat} className="print-panel panel mb-6 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
              <i className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_META[cat].color }} />
              <h2 className="font-semibold">{t(CATEGORY_META[cat].key)}</h2>
              <span className="ms-auto text-xs text-muted-foreground">
                {inCategory.length} {t("courses")}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs text-muted-foreground">
                  <Th>{t("courseCode")}</Th>
                  <Th>{t("courseName")}</Th>
                  <Th>{t("credits")}</Th>
                  <Th>{t("term")}</Th>
                  <Th>{t("status")}</Th>
                  <Th>{t("grade")}</Th>
                </tr>
              </thead>
              <tbody>
                {STATUS_ORDER.flatMap((status) => inCategory.filter((c) => c.status === status)).map((c: Course) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <Td>{c.code || "—"}</Td>
                    <Td className="font-medium">{c.name}</Td>
                    <Td>{c.credits ?? "—"}</Td>
                    <Td>{c.term || "—"}</Td>
                    <Td>{t(c.status)}</Td>
                    <Td>{c.final_grade || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="print-panel panel p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{String(value)}</p>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-5 py-2 font-medium">{children}</th>;
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-2 ${className ?? ""}`}>{children}</td>;
}
