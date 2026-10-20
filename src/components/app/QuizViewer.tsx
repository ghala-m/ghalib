import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Trophy,
  XCircle,
  Flame,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { playTickChime, playUnlockChime } from "@/lib/sound";
import { ConfettiBurst } from "@/components/app/ConfettiBurst";

export type QuizQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const COPY = {
  ar: {
    question: "السؤال",
    next: "التالي",
    results: "عرض النتيجة",
    correct: "إجابة صحيحة!",
    wrong: "إجابة خاطئة",
    explanation: "الشرح",
    streak: "متتالية",
    retry: "إعادة الاختبار",
    review: "راجع أخطاءك",
    perfect: "نتيجة مذهلة! أنت جاهز للاختبار الحقيقي.",
    good: "أحسنت! أنت قريب من الإتقان.",
    ok: "نتيجة جيدة، لكن راجع الأجزاء التي أخطأت فيها.",
    low: "لا بأس، التكرار سر الإتقان. راجع المادة وجرّب مرة ثانية.",
    yourAnswer: "إجابتك",
    rightAnswer: "الصحيحة",
    letters: ["أ", "ب", "ج", "د", "هـ", "و"],
    score: "النتيجة",
  },
  en: {
    question: "Question",
    next: "Next",
    results: "See results",
    correct: "Correct!",
    wrong: "Not quite",
    explanation: "Explanation",
    streak: "streak",
    retry: "Retake quiz",
    review: "Review your mistakes",
    perfect: "Amazing result! You're ready for the real exam.",
    good: "Well done! You're close to mastering it.",
    ok: "A decent score — revisit the parts you missed.",
    low: "No worries, repetition is the key. Review the material and try again.",
    yourAnswer: "Your answer",
    rightAnswer: "Correct",
    letters: ["A", "B", "C", "D", "E", "F"],
    score: "Score",
  },
} as const;

export function QuizViewer({ questions }: { questions: QuizQuestion[] }) {
  const { lang } = useI18n();
  const c = COPY[lang];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [burst, setBurst] = useState(0);
  const celebrated = useRef(false);

  useEffect(() => {
    setAnswers({});
    setCurrent(0);
    setShowResults(false);
    celebrated.current = false;
  }, [questions]);

  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.reduce(
    (s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  );
  const pct = total ? Math.round((correctCount / total) * 100) : 0;

  // Current run of correct answers ending at the latest answered question.
  const streak = useMemo(() => {
    let n = 0;
    for (let i = total - 1; i >= 0; i--) {
      if (answers[i] === undefined) continue;
      if (answers[i] === questions[i]!.correctIndex) n++;
      else break;
    }
    return n;
  }, [answers, questions, total]);

  useEffect(() => {
    if (!showResults || celebrated.current) return;
    celebrated.current = true;
    if (pct >= 70) playUnlockChime();
    else playTickChime();
    setBurst((n) => n + 1);
  }, [showResults, pct]);

  if (!total) return null;

  const restart = () => {
    setAnswers({});
    setCurrent(0);
    setShowResults(false);
    celebrated.current = false;
  };

  if (showResults) {
    const r = 52;
    const circ = 2 * Math.PI * r;
    const message = pct >= 90 ? c.perfect : pct >= 70 ? c.good : pct >= 50 ? c.ok : c.low;
    const ringColor =
      pct >= 70 ? "stroke-emerald-500" : pct >= 50 ? "stroke-amber-500" : "stroke-rose-500";
    const mistakes = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q, i }) => answers[i] !== q.correctIndex);
    return (
      <div className="relative mx-auto max-w-2xl space-y-5">
        <ConfettiBurst trigger={burst} className="pointer-events-none absolute inset-0 z-10" />
        <div className="study-pop rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 via-card to-fuchsia-500/10 p-6 text-center shadow-lg">
          <Trophy className="mx-auto size-8 text-violet-500" />
          <div className="relative mx-auto mt-3 size-36">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - (pct / 100) * circ}
                className={cn("transition-[stroke-dashoffset] duration-1000", ringColor)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums">{pct}%</span>
              <span className="text-[11px] text-muted-foreground">
                {correctCount} / {total}
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          <Button
            className="mt-4 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white hover:opacity-90"
            onClick={restart}
          >
            <RotateCcw className="size-4" />
            {c.retry}
          </Button>
        </div>

        {mistakes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-rose-600 dark:text-rose-300">
              {c.review} ({mistakes.length})
            </h4>
            {mistakes.map(({ q, i }) => (
              <div key={i} className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
                <p className="text-sm font-semibold">
                  {i + 1}. {q.prompt}
                </p>
                {answers[i] !== undefined && (
                  <p className="mt-2 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-300">
                    <XCircle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {c.yourAnswer}: {q.options[answers[i]!]}
                    </span>
                  </p>
                )}
                <p className="mt-1 flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {c.rightAnswer}: {q.options[q.correctIndex]}
                  </span>
                </p>
                {q.explanation && (
                  <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const q = questions[current]!;
  const picked = answers[current];
  const answered = picked !== undefined;
  const isLast = current === total - 1;
  const gotIt = answered && picked === q.correctIndex;

  return (
    <div className="mx-auto max-w-2xl">
      {/* header: progress dots + streak */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {questions.map((qq, i) => {
            const a = answers[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`${c.question} ${i + 1}`}
                className={cn(
                  "size-7 rounded-full text-[11px] font-bold transition-all",
                  i === current &&
                    "scale-110 ring-2 ring-violet-500 ring-offset-2 ring-offset-background",
                  a === undefined && "bg-muted text-muted-foreground hover:bg-muted/70",
                  a !== undefined && a === qq.correctIndex && "bg-emerald-500 text-white",
                  a !== undefined && a !== qq.correctIndex && "bg-rose-500 text-white",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        {streak >= 2 && (
          <span className="study-pop inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-300">
            <Flame className="size-3.5" />
            {streak} {c.streak}
          </span>
        )}
      </div>

      <div
        key={current}
        className="study-pop rounded-3xl border border-violet-500/25 bg-card p-5 shadow-md sm:p-6"
      >
        <span className="inline-flex items-center rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-300">
          {c.question} {current + 1} / {total}
        </span>
        <p className="mt-3 text-base leading-relaxed font-semibold sm:text-lg">{q.prompt}</p>

        <div className="mt-4 grid gap-2.5">
          {q.options.map((opt, oi) => {
            const isCorrect = oi === q.correctIndex;
            const isPicked = oi === picked;
            return (
              <button
                key={oi}
                type="button"
                disabled={answered}
                onClick={() => {
                  setAnswers((a) => ({ ...a, [current]: oi }));
                  playTickChime();
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border-2 px-3 py-3 text-start text-sm transition-all",
                  !answered &&
                    "border-border hover:-translate-y-0.5 hover:border-violet-500/60 hover:bg-violet-500/5 hover:shadow-md",
                  answered && isCorrect && "border-emerald-500 bg-emerald-500/10",
                  answered && isPicked && !isCorrect && "quiz-shake border-rose-500 bg-rose-500/10",
                  answered && !isPicked && !isCorrect && "border-border opacity-55",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                    !answered && "bg-violet-500/15 text-violet-600 dark:text-violet-300",
                    answered && isCorrect && "bg-emerald-500 text-white",
                    answered && isPicked && !isCorrect && "bg-rose-500 text-white",
                    answered && !isPicked && !isCorrect && "bg-muted text-muted-foreground",
                  )}
                >
                  {c.letters[oi] ?? oi + 1}
                </span>
                <span className="flex-1">{opt}</span>
                {answered && isCorrect && (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                )}
                {answered && isPicked && !isCorrect && (
                  <XCircle className="size-5 shrink-0 text-rose-500" />
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={cn(
              "study-pop mt-4 rounded-2xl p-4 text-sm",
              gotIt ? "bg-emerald-500/10" : "bg-rose-500/10",
            )}
          >
            <p
              className={cn(
                "font-bold",
                gotIt
                  ? "text-emerald-600 dark:text-emerald-300"
                  : "text-rose-600 dark:text-rose-300",
              )}
            >
              {gotIt ? c.correct : c.wrong}
            </p>
            {q.explanation && (
              <p className="mt-1.5 flex items-start gap-2 text-muted-foreground">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <span>{q.explanation}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((n) => n - 1)}>
          <ArrowRight className="size-4 ltr:hidden" />
          <ArrowLeft className="size-4 rtl:hidden" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {c.score}: {correctCount} / {answeredCount}
        </span>
        {isLast ? (
          <Button
            disabled={answeredCount < total}
            onClick={() => setShowResults(true)}
            className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white hover:opacity-90"
          >
            {c.results}
          </Button>
        ) : (
          <Button
            disabled={!answered}
            onClick={() => setCurrent((n) => n + 1)}
            className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white hover:opacity-90"
          >
            {c.next}
            <ArrowLeft className="size-4 ltr:hidden" />
            <ArrowRight className="size-4 rtl:hidden" />
          </Button>
        )}
      </div>
    </div>
  );
}
