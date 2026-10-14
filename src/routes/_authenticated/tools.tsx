import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Brain,
  Copy,
  FileText,
  Library,
  ListChecks,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { runStudyTool } from "@/lib/tools.functions";
import type { PreparedDoc } from "@/lib/files";
import { StudyFileInput } from "@/components/app/StudyFileInput";
import { StudyPlanOptions } from "@/components/app/StudyPlanOptions";
import { StudyDocument } from "@/components/app/StudyDocument";
import { defaultStudyOptions, StudyOptionsSchema, STUDY_COPY } from "@/lib/study-options";
import {
  coursesQuery,
  primaryNickname,
  saveStudyMaterial,
  type StudyMaterialKind,
} from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlashcardsViewer, type Flashcard } from "@/components/app/FlashcardsViewer";
import { QuizViewer, type QuizQuestion } from "@/components/app/QuizViewer";
import { cn } from "@/lib/utils";
import { withAiDetail } from "@/lib/ai-error-detail";

export const Route = createFileRoute("/_authenticated/tools")({
  head: () => ({
    meta: [
      { title: "Study tools — Ghalib Academic Assistant" },
      {
        name: "description",
        content:
          "Summaries, flashcards, practice quizzes and study plans generated from your own material.",
      },
      { property: "og:title", content: "Study tools — Ghalib Academic Assistant" },
      {
        property: "og:description",
        content: "Turn any lecture file into summaries, flashcards, quizzes and a study plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ToolsPage,
});

type Tool = "summarize" | "flashcards" | "quiz" | "explain" | "studyPlan";

const TOOLS: {
  id: Tool;
  icon: typeof FileText;
  title: "toolSummarize" | "toolFlashcards" | "toolQuiz" | "toolExplain" | "toolStudyPlan";
  body:
    | "toolSummarizeBody"
    | "toolFlashcardsBody"
    | "toolQuizBody"
    | "toolExplainBody"
    | "toolStudyPlanBody";
}[] = [
  { id: "summarize", icon: FileText, title: "toolSummarize", body: "toolSummarizeBody" },
  { id: "flashcards", icon: ListChecks, title: "toolFlashcards", body: "toolFlashcardsBody" },
  { id: "quiz", icon: Brain, title: "toolQuiz", body: "toolQuizBody" },
  { id: "explain", icon: BookOpen, title: "toolExplain", body: "toolExplainBody" },
  { id: "studyPlan", icon: Sparkles, title: "toolStudyPlan", body: "toolStudyPlanBody" },
];

const TOOL_LABEL_KEY = {
  summarize: "toolSummarize",
  flashcards: "toolFlashcards",
  quiz: "toolQuiz",
  explain: "toolExplain",
  studyPlan: "toolStudyPlan",
} as const;

/** A short, human-scannable label for a saved item's card in the library — first line of the
 * pasted text if there is one, else just the given fallback (usually "<tool name> — <date>"). */
function defaultTitle(text: string, fallback: string): string {
  const firstLine = text.trim().split("\n")[0]?.slice(0, 60);
  return firstLine || fallback;
}

function ToolsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const run = useServerFn(runStudyTool);
  const { data: courses = [] } = useQuery(coursesQuery());
  const currentCourses = courses.filter((c) => !c.archived && c.status === "current");
  const [tool, setTool] = useState<Tool>("summarize");
  const [courseId, setCourseId] = useState<string>("none");
  const [text, setText] = useState("");
  const [file, setFile] = useState<PreparedDoc | null>(null);
  const [reading, setReading] = useState(false);
  const [options, setOptions] = useState(defaultStudyOptions);
  const c = STUDY_COPY[lang];
  const sourceText = [text, file?.kind === "text" ? file.text : ""].filter(Boolean).join("\n\n");
  const [output, setOutput] = useState<
    | { kind: "text"; text: string }
    | { kind: "flashcards"; cards: Flashcard[] }
    | { kind: "quiz"; questions: QuizQuestion[] }
    | null
  >(null);

  const execute = useMutation({
    mutationFn: async () => {
      if (!sourceText.trim() && !file) throw new Error("EMPTY_INPUT");
      if (sourceText.length > 60000) throw new Error("TEXT_TOO_LARGE");
      if (tool === "studyPlan" && !StudyOptionsSchema.safeParse(options).success) throw new Error("INVALID_OPTIONS");
      const res = (await run({
        data: {
          tool,
          lang,
          text: sourceText,
          ...(file ? { fileName: file.fileName } : {}),
          ...(file?.kind === "pdf" ? { pdfBase64: file.base64 } : {}),
          ...(file?.kind === "image" ? { imageBase64: file.base64, imageMediaType: "image/png" as const } : {}),
          ...(tool === "studyPlan" ? { options } : {}),
        },
      })) as
        | { kind: "text"; text: string }
        | { kind: "flashcards"; cards: Flashcard[] }
        | { kind: "quiz"; questions: QuizQuestion[] };
      return res;
    },
    onSuccess: async (value) => {
      setOutput(value);
      if (!user) return;
      const content =
        value.kind === "text"
          ? { text: value.text }
          : value.kind === "flashcards"
            ? { cards: value.cards }
            : { questions: value.questions };
      try {
        const saved = await saveStudyMaterial({
          userId: user.id,
          courseId: courseId === "none" ? null : courseId,
          kind: tool,
          title: defaultTitle(
            file?.fileName || text,
            `${t(TOOL_LABEL_KEY[tool])} — ${new Date().toLocaleDateString()}`,
          ),
          content,
          sourceExcerpt: file?.fileName || (text ? text.slice(0, 240) : null),
        });
        void qc.invalidateQueries({ queryKey: ["study-materials"] });
        // Flashcards specifically benefit from landing on the reusable review page right away —
        // that was the explicit ask: finish generating, get taken straight to "all my flashcards"
        // rather than only seeing this one batch in the tool's result panel.
        if (tool === "flashcards") {
          toast.success(t("savedToLibraryOpening"));
          sessionStorage.setItem("study-library:focus", saved.id);
          void navigate({ to: "/study-library" });
        } else {
          toast.success(t("savedToLibrary"));
        }
      } catch (e) {
        console.error("[study-materials] save failed", e);
        // Saving is a nice-to-have layered on top of the tool actually working — a save failure
        // (e.g. RLS hiccup) shouldn't make it look like generation itself failed.
      }
    },
    onError: (e: Error) => {
      if (e.message.includes("INVALID_OPTIONS") || e.message.includes("INVALID_STUDY_DATE")) toast.error(c.invalid);
      else if (e.message.includes("TEXT_TOO_LARGE")) toast.error(lang === "ar" ? "النص طويل؛ الحد الأقصى 60 ألف حرف" : "Maximum text length is 60,000 characters");
      else if (e.message.includes("EMPTY_INPUT")) toast.error(t("emptyInput"));
      else if (e.message.includes("Missing LOVABLE_API_KEY")) toast.error(t("aiKeyMissing"));
      else if (e.message.includes("RATE_LIMIT")) toast.error(t("aiRateLimit"));
      else if (e.message.includes("NO_CREDITS")) toast.error(t("aiCredits"));
      else toast.error(withAiDetail(t("aiFailed"), e));
    },
  });

  return (
    <div className="surface-gradient min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("studyTools")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("studyToolsHint")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/study-library" })}>
              <Library className="size-4" />
              {t("studyLibrary")}
            </Button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TOOLS.map((item) => (
            <Button
              variant="outline"
              disabled={execute.isPending}
              aria-pressed={tool === item.id}
              key={item.id}
              type="button"
              onClick={() => {
                setTool(item.id);
                setOutput(null);
              }}
              className={cn(
                "h-auto flex-col items-start whitespace-normal rounded-lg p-4 text-start transition-colors",
                tool === item.id ? "border-accent ring-1 ring-accent" : "hover:border-accent/50",
              )}
            >
              <item.icon className="size-5 text-accent" />
              <p className="mt-2 text-sm font-semibold">{t(item.title)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t(item.body)}</p>
            </Button>
          ))}
        </div>

        <div className="panel mt-6 space-y-4 p-6">
          <div className="max-w-xs space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("linkedCourse")}</label>
            <Select value={courseId} disabled={execute.isPending} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noCourseLink")}</SelectItem>
                {currentCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {[c.code, primaryNickname(c.nickname) || c.name].filter(Boolean).join(" · ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            disabled={execute.isPending}
            maxLength={60000}
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("pasteMaterial")}
          />
          <StudyFileInput value={file} onChange={setFile} disabled={execute.isPending} onBusyChange={setReading} />
          {tool === "studyPlan" && <StudyPlanOptions value={options} onChange={setOptions} disabled={execute.isPending} />}
          <div className="flex justify-end">
            <Button
              className="ms-auto"
              disabled={execute.isPending || reading}
              onClick={() => execute.mutate()}
            >
              {execute.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {t("run")}
            </Button>
          </div>
        </div>

        {output ? (
          <div className="panel mt-6 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">{t("result")}</h2>
              {output.kind === "text" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(output.text);
                    toast.success(t("copied"));
                  }}
                >
                  <Copy className="size-4" />
                  {t("copy")}
                </Button>
              )}
            </div>
            {output.kind === "text" && <StudyDocument text={output.text} title={tool === "studyPlan" ? c.plan : tool === "summarize" ? c.summary : t(TOOL_LABEL_KEY[tool])} subtitle={file?.fileName} />}
            {output.kind === "flashcards" && <FlashcardsViewer cards={output.cards} />}
            {output.kind === "quiz" && <QuizViewer questions={output.questions} />}
          </div>
        ) : null}
      </div>
    </div>
  );
}
