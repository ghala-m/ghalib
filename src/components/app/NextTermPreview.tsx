import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { nextTermPreview, CATEGORY_META } from "@/lib/plan";
import { useI18n } from "@/lib/i18n";
import type { Course } from "@/lib/queries";

/**
 * Shows the courses that would become available to register for once the student's
 * current-term courses are completed. Read-only preview, no simulation controls —
 * see `nextTermPreview` in lib/plan.ts for the "assume current courses pass" logic.
 */
export function NextTermPreview({ courses }: { courses: Course[] }) {
  const { t } = useI18n();
  const upcoming = nextTermPreview(courses);

  if (upcoming.length === 0) {
    return (
      <div className="panel p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-accent" />
          {t("nextTermTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("nextTermEmpty")}</p>
      </div>
    );
  }

  const totalCredits = upcoming.reduce((s, c) => s + (c.credits ?? 0), 0);

  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-accent" />
          {t("nextTermTitle")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {totalCredits} {t("newCreditsSummary")}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("nextTermHint")}</p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {upcoming.map((c) => (
          <li key={c.id}>
            <Link
              to="/courses/$courseId"
              params={{ courseId: c.id }}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
            >
              <i
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: CATEGORY_META[c.category].color }}
              />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{c.code || "—"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
