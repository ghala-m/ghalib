import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, RefreshCw } from "lucide-react";
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
    <section className="panel mb-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-primary" />
          {t("weeklyPlanTitle")}
        </h2>
        <Button size="sm" variant="outline" onClick={() => gen.mutate()} disabled={gen.isPending}>
          {text ? <RefreshCw className="size-4" /> : null}
          {text ? t("weeklyPlanRefresh") : t("weeklyPlanGenerate")}
        </Button>
      </div>
      {text ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{text}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t("weeklyPlanHint")}</p>
      )}
    </section>
  );
}
