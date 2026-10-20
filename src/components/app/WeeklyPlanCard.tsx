import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CalendarCheck2, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { generateWeeklyPlan } from "@/lib/weekly-plan.functions";
import { withAiDetail } from "@/lib/ai-error-detail";

type Item = {
  title: string;
  type: string;
  due_date: string | null;
  completed: boolean;
  weight: number | null;
};

/** AI weekly plan for one course, cached per course/day in localStorage so it doesn't spend an
 * AI call on every page visit. */
export function WeeklyPlanCard({
  courseId,
  courseName,
  items,
  gradeWeights,
}: {
  courseId: string;
  courseName: string;
  items: Item[];
  gradeWeights: { category: string; percentage: number }[];
}) {
  const { t, lang } = useI18n();
  const run = useServerFn(generateWeeklyPlan);
  const today = new Date().toISOString().slice(0, 10);
  const key = `ghalib-weekly-plan:${courseId}:${today}`;
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    try {
      setText(localStorage.getItem(key));
    } catch {
      setText(null);
    }
  }, [key]);

  const gen = useMutation({
    mutationFn: async () => {
      const res = await run({ data: { lang, courseName, today, items, gradeWeights } });
      return res.text;
    },
    onSuccess: (r) => {
      setText(r);
      try {
        localStorage.setItem(key, r);
      } catch {
        /* storage unavailable — plan still shows for this visit */
      }
    },
    onError: (e: Error) => {
      if (e.message.includes("RATE_LIMIT")) toast.error(t("aiRateLimit"));
      else if (e.message.includes("NO_CREDITS")) toast.error(t("aiCredits"));
      else toast.error(withAiDetail(t("aiChatFailed"), e));
    },
  });

  return (
    <section className="panel mb-6 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
            <CalendarCheck2 className="size-5" />
          </span>
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              {t("weeklyPlanTitle")}
              <Sparkles className="size-4 text-fuchsia-500" />
            </h2>
            <p className="text-xs text-muted-foreground">{courseName}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant={text ? "outline" : "default"}
          onClick={() => gen.mutate()}
          disabled={gen.isPending}
          className={
            text
              ? ""
              : "rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md hover:opacity-90"
          }
        >
          {gen.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : text ? (
            <RefreshCw className="size-4" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {text ? t("weeklyPlanRefresh") : t("weeklyPlanGenerate")}
        </Button>
      </div>
      <div className="p-5 pt-4">
        {gen.isPending ? (
          <div className="space-y-2" aria-busy="true">
            {[90, 75, 85, 60].map((w) => (
              <div
                key={w}
                className="h-3 animate-pulse rounded-full bg-muted"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        ) : text ? (
          <div className="chat-md study-pop rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm leading-7">
            <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-violet-500/30 bg-violet-500/5 p-4 text-center text-sm text-muted-foreground">
            {t("weeklyPlanHint")}
          </p>
        )}
      </div>
    </section>
  );
}
