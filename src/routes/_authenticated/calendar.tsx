import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import { CalendarView } from "@/components/app/CalendarView";
import { ThemeModeToggle } from "@/components/app/ThemeControls";
import { LangToggle } from "@/components/LangToggle";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Ghalib Academic Assistant" },
      {
        name: "description",
        content: "Daily, weekly and monthly view of your classes, assignments and exams.",
      },
      { property: "og:title", content: "Calendar — Ghalib Academic Assistant" },
      {
        property: "og:description",
        content: "See every class, assignment and exam by day, week or month.",
      },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { t } = useI18n();
  return (
    <div className="surface-gradient min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">{t("calendar")}</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/term-calendar">
                <CalendarRange className="size-4" />
                {t("viewTermCalendar")}
              </Link>
            </Button>
            <ThemeModeToggle />
            <LangToggle variant="outline" />
          </div>
        </header>
        <CalendarView />
      </div>
    </div>
  );
}
