import { createFileRoute } from "@tanstack/react-router";
import { AdvisorChat } from "@/components/app/AdvisorChat";
import { ThemeModeToggle } from "@/components/app/ThemeControls";
import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/advisor")({
  head: () => ({
    meta: [
      { title: "AI advisor — Ghalib Academic Assistant" },
      { name: "description", content: "Chat with an AI advisor that knows your courses, grades and deadlines." },
      { property: "og:title", content: "AI advisor — Ghalib Academic Assistant" },
      { property: "og:description", content: "Study plans, revision schedules and course advice, personalised to you." },
    ],
  }),
  component: AdvisorPage,
});

function AdvisorPage() {
  const { t } = useI18n();
  return (
    <div className="surface-gradient min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">{t("advisor")}</h1>
          <div className="flex items-center gap-2">
            <ThemeModeToggle />
            <LangToggle variant="outline" />
          </div>
        </header>
        <AdvisorChat />
      </div>
    </div>
  );
}
