import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenCheck, CalendarClock, FileUp, MessagesSquare, RotateCcw, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ghalib — Turn your syllabus into a semester plan" },
      {
        name: "description",
        content:
          "Ghalib extracts your class schedule, exams, assignments and grade weights from any syllabus PDF and builds a live dashboard per course.",
      },
      { property: "og:title", content: "Ghalib — Turn your syllabus into a semester plan" },
      {
        property: "og:description",
        content:
          "Upload a syllabus, review the AI extraction, and get a checklist, timeline and grade breakdown for every course.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { t, dir } = useI18n();

  const features = [
    { icon: FileUp, title: t("f1t"), body: t("f1b") },
    { icon: MessagesSquare, title: t("f2t"), body: t("f2b") },
    { icon: RotateCcw, title: t("f3t"), body: t("f3b") },
    { icon: BookOpenCheck, title: t("f4t"), body: t("f4b") },
  ];

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ScrollText className="size-5" />
          </div>
          <span className="font-display text-lg font-bold">{t("appName")}</span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button asChild variant="outline" size="sm">
            <Link to="/auth">{t("signIn")}</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="grid-paper border-y border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <p className="mb-4 inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {t("tagline")}
            </p>
            <h1 className="max-w-3xl text-4xl leading-tight font-bold text-balance md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">{t("heroBody")}</p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link to="/auth">{t("getStarted")}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-2xl font-bold md:text-3xl">{t("featuresTitle")}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {features.map((f) => (
              <article key={f.title} className="panel p-6">
                <f.icon className="size-6 text-accent" />
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-secondary/40">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <CalendarClock className="size-8 text-primary" />
              <p className="max-w-md text-lg font-medium">{t("heroBody")}</p>
            </div>
            <Button asChild size="lg">
              <Link to="/auth">{t("getStarted")}</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        {t("appName")} — {t("tagline")}
      </footer>
    </div>
  );
}
