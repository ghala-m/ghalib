import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowRight, CalendarRange, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  allItemsQuery,
  coursesQuery,
  eventsQuery,
  termCalendarEventsQuery,
  termsQuery,
} from "@/lib/queries";
import { SemesterGrid } from "@/components/app/SemesterGrid";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { exportTermCalendarPdf, type CalendarPdfMark } from "@/lib/term-calendar-pdf";
import { buildDateMarks, buildSemesterGrid } from "@/lib/semester-grid";

export const Route = createFileRoute("/_authenticated/term-calendar")({
  head: () => ({
    meta: [{ title: "Term calendar — Ghalib" }],
  }),
  component: TermCalendarPage,
});

function TermCalendarPage() {
  const { t, dir } = useI18n();
  const { data: terms = [] } = useQuery(termsQuery());
  const { data: allItems = [] } = useQuery(allItemsQuery());
  const { data: allEvents = [] } = useQuery(eventsQuery());
  const activeTerm = terms.find((x) => x.is_active) ?? terms[0] ?? null;
  const { data: milestones = [] } = useQuery(termCalendarEventsQuery(activeTerm?.id));
  const { data: courses = [] } = useQuery(coursesQuery());
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    if (!activeTerm?.start_date) return;
    setDownloading(true);
    try {
      const months = activeTerm.weeks_count
        ? buildSemesterGrid({
            startDate: activeTerm.start_date,
            weeksCount: activeTerm.weeks_count,
          })
        : activeTerm.end_date
          ? buildSemesterGrid({ startDate: activeTerm.start_date, endDate: activeTerm.end_date })
          : buildSemesterGrid({ startDate: activeTerm.start_date, weeksCount: 16 });

      const courseLabel = (id: string | null) => {
        const c = courses.find((x) => x.id === id);
        return c?.nickname || c?.code || c?.name || "";
      };
      const marks = buildDateMarks({
        items: allItems.filter((i) => !!i.due_date),
        events: allEvents,
        milestones,
        courseLabel,
      });
      const marksByDate = new Map<string, CalendarPdfMark[]>();
      for (const [date, list] of marks) {
        marksByDate.set(
          date,
          list.map((m) => ({ date, label: m.label })),
        );
      }

      await exportTermCalendarPdf({
        semesterName: activeTerm.name,
        months,
        marksByDate,
        todayIso: new Date().toISOString().slice(0, 10),
      });
    } catch (e) {
      console.error("[pdf-export]", e);
      toast.error(t("pdfExportFailedGeneric"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      dir={dir}
      className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10 print:max-w-none print:px-0 print:py-0"
    >
      <div className="print-hide mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4 rtl:rotate-180" />
          {t("backToDashboard")}
        </Link>
        {activeTerm ? (
          <div className="flex items-center gap-2">
            <Button onClick={download} disabled={downloading}>
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t("downloadPdf")}
            </Button>
          </div>
        ) : null}
      </div>

      {!activeTerm ? (
        <div className="panel flex flex-col items-center gap-3 p-10 text-center">
          <CalendarRange className="size-8 text-muted-foreground" />
          <p className="font-medium">{t("noActiveTerm")}</p>
          <p className="text-sm text-muted-foreground">{t("startTermHint")}</p>
        </div>
      ) : !activeTerm.start_date ? (
        <div className="panel flex flex-col items-center gap-3 p-10 text-center">
          <CalendarRange className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("semesterGridNoStartDate")}</p>
        </div>
      ) : (
        <div ref={contentRef} className="print-panel panel overflow-hidden p-4 sm:p-6">
          <SemesterGrid
            term={activeTerm}
            items={allItems.filter((i) => !!i.due_date)}
            events={allEvents}
            milestones={milestones}
            courses={courses}
          />
        </div>
      )}
    </div>
  );
}
