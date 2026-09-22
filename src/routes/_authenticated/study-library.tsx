import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Brain,
  ChevronDown,
  FileText,
  LayoutGrid,
  List,
  ListChecks,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  coursesQuery,
  deleteStudyMaterial,
  primaryNickname,
  studyMaterialsQuery,
  type Course,
  type StudyMaterial,
} from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { FlashcardsViewer, type Flashcard } from "@/components/app/FlashcardsViewer";
import { QuizViewer, type QuizQuestion } from "@/components/app/QuizViewer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/study-library")({
  head: () => ({
    meta: [
      { title: "Study library — Ghalib Academic Assistant" },
      { name: "description", content: "Everything generated in Study Tools, organized by course." },
    ],
  }),
  component: StudyLibraryPage,
});

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

function courseLabel(c: Course): string {
  return [c.code, primaryNickname(c.nickname) || c.name].filter(Boolean).join(" · ");
}

function StudyLibraryPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: materials = [], isLoading } = useQuery(studyMaterialsQuery());
  const { data: courses = [] } = useQuery(coursesQuery());
  const [openId, setOpenId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window === "undefined") return "list";
    return (localStorage.getItem("study-library:view") as "list" | "grid" | null) ?? "list";
  });
  const changeViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    if (typeof window !== "undefined") localStorage.setItem("study-library:view", mode);
  };

  // Set by the Study Tools page right before navigating here after saving a fresh batch of
  // flashcards — scrolls to and expands that specific item once, then forgets it.
  useEffect(() => {
    const focusId = sessionStorage.getItem("study-library:focus");
    if (!focusId) return;
    sessionStorage.removeItem("study-library:focus");
    setOpenId(focusId);
    requestAnimationFrame(() => {
      document
        .getElementById(`material-${focusId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const remove = useMutation({
    mutationFn: (id: string) => deleteStudyMaterial(id),
    onSuccess: () => {
      toast.success(t("materialDeleted"));
      void qc.invalidateQueries({ queryKey: ["study-materials"] });
    },
  });

  const groups = useMemo(() => {
    const byCourse = new Map<string | null, StudyMaterial[]>();
    for (const m of materials) {
      const key = m.course_id;
      const list = byCourse.get(key) ?? [];
      list.push(m);
      byCourse.set(key, list);
    }
    const courseGroups = courses
      .filter((c) => byCourse.has(c.id))
      .map((c) => ({ course: c, items: byCourse.get(c.id) ?? [] }));
    const unassigned = byCourse.get(null) ?? [];
    return { courseGroups, unassigned };
  }, [materials, courses]);

  return (
    <div className="surface-gradient min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8">
          <Link
            to="/tools"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="size-4 rtl:rotate-180" />
            {t("backToTools")}
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold">{t("studyLibrary")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("studyLibraryHint")}</p>
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-1">
              <button
                type="button"
                onClick={() => changeViewMode("list")}
                className={cn(
                  "rounded-md p-1.5",
                  viewMode === "list"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                )}
                aria-label={t("viewAsList")}
              >
                <List className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => changeViewMode("grid")}
                className={cn(
                  "rounded-md p-1.5",
                  viewMode === "grid"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                )}
                aria-label={t("viewAsGrid")}
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </header>

        {!isLoading && materials.length === 0 ? (
          <p className="panel p-6 text-sm text-muted-foreground">{t("noSavedMaterials")}</p>
        ) : (
          <div className="space-y-8">
            {groups.courseGroups.map(({ course, items }) => (
              <section key={course.id}>
                <h2 className="mb-3 text-sm font-bold tracking-wide text-accent">
                  {courseLabel(course)}
                </h2>
                <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-3" : "space-y-2"}>
                  {items.map((m) => (
                    <MaterialCard
                      key={m.id}
                      material={m}
                      open={openId === m.id}
                      onToggle={setOpenId}
                      onDelete={(id) => remove.mutate(id)}
                      gridMode={viewMode === "grid"}
                    />
                  ))}
                </div>
              </section>
            ))}

            {groups.unassigned.length > 0 ? (
              <section>
                <h2 className="mb-3 text-sm font-bold tracking-wide text-muted-foreground">
                  {t("unassignedMaterials")}
                </h2>
                <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-3" : "space-y-2"}>
                  {groups.unassigned.map((m) => (
                    <MaterialCard
                      key={m.id}
                      material={m}
                      open={openId === m.id}
                      onToggle={setOpenId}
                      onDelete={(id) => remove.mutate(id)}
                      gridMode={viewMode === "grid"}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function MaterialCard({
  material,
  open,
  onToggle,
  onDelete,
  gridMode,
}: {
  material: StudyMaterial;
  open: boolean;
  onToggle: (id: string | null) => void;
  onDelete: (id: string) => void;
  gridMode: boolean;
}) {
  const { t } = useI18n();
  const Icon = KIND_ICON[material.kind] ?? FileText;
  const content = material.content as
    { text: string } | { cards: Flashcard[] } | { questions: QuizQuestion[] };

  return (
    <div
      id={`material-${material.id}`}
      className={cn("panel overflow-hidden p-0", gridMode && open && "sm:col-span-3")}
    >
      <button
        type="button"
        onClick={() => onToggle(open ? null : material.id)}
        className={cn(
          "flex w-full items-start gap-3 p-4 text-start hover:bg-muted/30",
          gridMode && !open && "h-full flex-col",
        )}
      >
        <Icon className="size-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-medium",
              gridMode && !open ? "line-clamp-2 text-sm" : "truncate text-sm",
            )}
          >
            {material.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(KIND_LABEL_KEY[material.kind] ?? "toolSummarize")} ·{" "}
            {new Date(material.created_at).toLocaleDateString()}
          </p>
        </div>
        {!gridMode || open ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(material.id);
              }}
              aria-label={t("deleteMaterial")}
            >
              <Trash2 className="size-4" />
            </Button>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </>
        ) : null}
      </button>
      {open ? (
        <div className="border-t border-border p-4">
          {"text" in content && <p className="text-sm whitespace-pre-wrap">{content.text}</p>}
          {"cards" in content && <FlashcardsViewer cards={content.cards} />}
          {"questions" in content && <QuizViewer questions={content.questions} />}
        </div>
      ) : null}
    </div>
  );
}
