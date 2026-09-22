import { Link } from "@tanstack/react-router";
import { Brain, FileText, ListChecks, Sparkles } from "lucide-react";
import type { StudyMaterial } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";

const KIND_ICON: Record<string, typeof FileText> = {
  summarize: FileText,
  flashcards: ListChecks,
  quiz: Brain,
  explain: FileText,
  studyPlan: Sparkles,
};
const KIND_LABEL_KEY: Record<
  string,
  "toolSummarize" | "toolFlashcards" | "toolQuiz" | "toolExplain" | "toolStudyPlan"
> = {
  summarize: "toolSummarize",
  flashcards: "toolFlashcards",
  quiz: "toolQuiz",
  explain: "toolExplain",
  studyPlan: "toolStudyPlan",
};

/** Shows this course's saved Study Tools output (summaries, flashcards, quizzes) right on the
 * course page — so the student doesn't have to remember to go hunt for them in the library
 * separately. Capped to a handful with a "view all" link rather than the full list, since this
 * is one section among several on an already busy page. */
export function CourseMaterialsSection({ materials }: { materials: StudyMaterial[] }) {
  const { t } = useI18n();
  const shown = materials.slice(0, 6);

  return (
    <section className="panel mt-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("courseMaterials")}</h2>
        <Link to="/study-library" className="text-xs text-accent hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("noCourseMaterialsYet")}</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {shown.map((m) => {
            const Icon = KIND_ICON[m.kind] ?? FileText;
            return (
              <li key={m.id}>
                <Link
                  to="/study-library"
                  className="flex items-center gap-2.5 rounded-lg border border-border p-3 text-sm hover:bg-muted/40"
                >
                  <Icon className="size-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t(KIND_LABEL_KEY[m.kind] ?? "toolSummarize")} ·{" "}
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
