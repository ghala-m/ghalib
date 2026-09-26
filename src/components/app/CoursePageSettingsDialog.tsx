import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, RotateCcw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SyllabusPanel } from "@/components/app/SyllabusPanel";
import type { Course } from "@/lib/queries";

export const DEFAULT_SECTION_ORDER = ["grades", "materials", "calendar", "checklist"] as const;
export type SectionKey = (typeof DEFAULT_SECTION_ORDER)[number];

const SECTION_LABEL_KEY: Record<
  SectionKey,
  "sectionGrades" | "sectionMaterials" | "sectionCalendar" | "sectionChecklist"
> = {
  grades: "sectionGrades",
  materials: "sectionMaterials",
  calendar: "sectionCalendar",
  checklist: "sectionChecklist",
};

/** Reads course.section_order defensively — it's a jsonb column, so a value that predates this
 * feature, or was hand-edited, might not be a clean array of the four known keys. Falls back to
 * the default order for anything that doesn't parse to exactly that. */
export function parseSectionOrder(raw: unknown): SectionKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SECTION_ORDER];
  const valid = raw.filter((k): k is SectionKey => DEFAULT_SECTION_ORDER.includes(k as SectionKey));
  const missing = DEFAULT_SECTION_ORDER.filter((k) => !valid.includes(k));
  return [...valid, ...missing];
}

/** Bundles the three course-page settings requests together: moving the syllabus re-upload
 * control out of the main page (it's an occasional action, not something that should dominate
 * the page every visit), a way to reorder the page's main sections (some students want the
 * checklist first, others the calendar), and a one-click reset back to the default order. */
export function CoursePageSettingsDialog({ course }: { course: Course }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<SectionKey[]>(() => parseSectionOrder(course.section_order));

  useEffect(() => {
    setOrder(parseSectionOrder(course.section_order));
  }, [course.section_order]);

  const saveOrder = useMutation({
    mutationFn: async (next: SectionKey[]) => {
      const { error } = await supabase
        .from("courses")
        .update({ section_order: next })
        .eq("id", course.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course", course.id] }),
    onError: () => toast.error(t("saveFailed")),
  });

  const move = (index: number, dir: -1 | 1) => {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    setOrder(next);
    saveOrder.mutate(next);
  };

  const reset = () => {
    const defaultOrder = [...DEFAULT_SECTION_ORDER];
    setOrder(defaultOrder);
    saveOrder.mutate(defaultOrder);
    toast.success(t("sectionOrderReset"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("coursePageSettings")}>
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("coursePageSettings")}</DialogTitle>
          <DialogDescription>{t("coursePageSettingsHint")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("uploadSyllabus")}</h3>
            <SyllabusPanel course={course} />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("sectionOrder")}</h3>
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
                <RotateCcw className="size-3.5" />
                {t("resetOrder")}
              </Button>
            </div>
            <ul className="space-y-1.5">
              {order.map((key, i) => (
                <li
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{t(SECTION_LABEL_KEY[key])}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={t("moveUp")}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={i === order.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={t("moveDown")}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
