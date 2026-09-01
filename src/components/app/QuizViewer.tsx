import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type QuizQuestion = { prompt: string; options: string[]; correctIndex: number; explanation: string };

export function QuizViewer({ questions }: { questions: QuizQuestion[] }) {
  const { t } = useI18n();
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.reduce((s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0), 0);

  return (
    <div className="space-y-5">
      {answeredCount > 0 && (
        <p className="text-sm font-medium">
          {t("quizScore")}: {correctCount} / {answeredCount}
          {answeredCount === questions.length ? ` · ${t("quizDone")}` : ""}
        </p>
      )}
      {questions.map((q, qi) => {
        const picked = answers[qi];
        const answered = picked !== undefined;
        return (
          <div key={qi} className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium">
              {qi + 1}. {q.prompt}
            </p>
            <div className="mt-3 grid gap-2">
              {q.options.map((opt, oi) => {
                const isCorrect = oi === q.correctIndex;
                const isPicked = oi === picked;
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={answered}
                    onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-start text-sm transition-colors",
                      !answered && "hover:border-accent/50",
                      answered && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                      answered && isPicked && !isCorrect && "border-destructive/50 bg-destructive/10",
                      answered && !isPicked && !isCorrect && "opacity-60",
                    )}
                  >
                    <span>{opt}</span>
                    {answered && isCorrect && <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
                    {answered && isPicked && !isCorrect && <XCircle className="size-4 shrink-0 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {answered && <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>}
          </div>
        );
      })}
    </div>
  );
}
