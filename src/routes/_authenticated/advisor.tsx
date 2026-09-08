import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { AdvisorChat } from "@/components/app/AdvisorChat";
import { ThemeModeToggle } from "@/components/app/ThemeControls";
import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/advisor")({
  head: () => ({
    meta: [
      { title: "AI advisor — Ghalib Academic Assistant" },
      {
        name: "description",
        content: "Chat with an AI advisor that knows your courses, grades and deadlines.",
      },
      { property: "og:title", content: "AI advisor — Ghalib Academic Assistant" },
      {
        property: "og:description",
        content: "Study plans, revision schedules and course advice, personalised to you.",
      },
    ],
  }),
  component: AdvisorPage,
});

function AdvisorPage() {
  const { t } = useI18n();
  return (
    <div className="surface-gradient min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-accent/15 via-accent/5 to-transparent px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("advisor")}</h1>
              <p className="text-sm text-muted-foreground">{t("advisorHint")}</p>
            </div>
          </div>
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
