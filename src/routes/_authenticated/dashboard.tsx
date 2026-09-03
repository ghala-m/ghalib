import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, CalendarClock, GraduationCap, Layers } from "lucide-react";
import { coursesQuery, profileQuery, upcomingItemsQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { useAutoStreak } from "@/hooks/useAutoStreak";
import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { ThemeModeToggle } from "@/components/app/ThemeControls";
import { PrereqFlowChart } from "@/components/app/PrereqFlowChart";
import { NextTermPreview } from "@/components/app/NextTermPreview";
import { StudyStreak } from "@/components/app/StudyStreak";
import { GpaTrendChart } from "@/components/app/GpaTrendChart";
import { TermControls } from "@/components/app/TermControls";
import { CalendarView } from "@/components/app/CalendarView";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ghalib Academic Assistant" },
      { name: "description", content: "Your semester at a glance: GPA, credits, courses and upcoming deadlines." },
      { property: "og:title", content: "Dashboard — Ghalib Academic Assistant" },
      { property: "og:description", content: "Track GPA, credits, courses and upcoming deadlines in one view." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: courses = [] } = useQuery(coursesQuery());
  const { data: upcoming = [] } = useQuery(upcomingItemsQuery());
  useAutoStreak();

  const active = courses.filter((c) => c.status === "current" && !c.archived);
  const stats = [
    { icon: GraduationCap, label: t("overallGpa"), value: profile?.overall_gpa ?? "—" },
    { icon: Layers, label: t("semesterGpa"), value: profile?.semester_gpa ?? "—" },
    { icon: BookMarked, label: t("totalCredits"), value: profile?.total_credits ?? 0 },
    { icon: CalendarClock, label: t("current"), value: active.length },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("dashboard")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.major || t("none")} · {profile?.current_term || t("none")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeModeToggle />
          <LangToggle variant="outline" />
        </div>
      </header>

      <div className="mb-6">
        <TermControls />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <s.icon className="size-5 text-accent" />
            <p className="mt-3 text-2xl font-bold">{String(s.value)}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <StudyStreak />
      </div>

      <div className="mt-6">
        <GpaTrendChart />
      </div>

      <section className="mt-10">
        <PrereqFlowChart courses={courses.filter((c) => !c.archived)} />
      </section>

      <section className="mt-6">
        <NextTermPreview courses={courses.filter((c) => !c.archived)} />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">{t("calendar")}</h2>
        <CalendarView />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">{t("upcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="panel p-6 text-sm text-muted-foreground">{t("nothingUpcoming")}</p>
        ) : (
          <ul className="panel divide-y divide-border">
            {upcoming.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.courses?.name} · {t(item.type)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {item.due_date
                    ? new Date(item.due_date).toLocaleDateString(lang === "ar" ? "ar" : "en-GB", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">{t("current")}</h2>
        {active.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="font-medium">{t("noCourses")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("addFirstCourse")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((c) => (
              <Link
                key={c.id}
                to="/courses/$courseId"
                params={{ courseId: c.id }}
                className="panel p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <p className="text-xs text-muted-foreground">{c.code || t("none")}</p>
                <p className="mt-1 font-semibold">{c.name}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.instructor || t("none")} · {c.term || t("none")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
