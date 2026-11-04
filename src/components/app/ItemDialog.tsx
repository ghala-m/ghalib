import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { isMissingSchemaError } from "@/lib/db-errors";
import { contribution, scoreToPercent } from "@/lib/grades";
import type { CourseItem, ItemType } from "@/lib/queries";

const TYPES: ItemType[] = ["assignment", "exam", "quiz", "project", "other"];

export function ItemDialog({
  courseId,
  item,
  trigger,
  defaultDate,
}: {
  courseId: string;
  item?: CourseItem;
  trigger: ReactNode;
  defaultDate?: string;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "assignment" as ItemType,
    due_date: defaultDate ?? "",
    due_time: "",
    weight: "",
    score_earned: "",
    score_max: "",
    drop_lowest: false,
    description: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: item?.title ?? "",
      type: item?.type ?? "assignment",
      due_date: item?.due_date ?? defaultDate ?? "",
      due_time: item?.due_time ?? "",
      weight: item?.weight?.toString() ?? "",
      // Older rows only have a percent: show it as "x / 100" so nothing is lost on edit.
      score_earned: (item?.score_earned ?? item?.score_percent)?.toString() ?? "",
      score_max: (item?.score_max ?? (item?.score_percent != null ? 100 : ""))?.toString() ?? "",
      drop_lowest: item?.drop_lowest ?? false,
      description: item?.description ?? "",
    });
  }, [open, item, defaultDate]);

  const percent = scoreToPercent(form.score_earned, form.score_max);
  const weightNum = form.weight ? Number(form.weight) : null;
  const points = contribution(weightNum, percent);
  const scoreInvalid =
    form.score_earned !== "" &&
    form.score_max !== "" &&
    Number(form.score_earned) > Number(form.score_max);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["course", courseId] });
    qc.invalidateQueries({ queryKey: ["items", "all"] });
    qc.invalidateQueries({ queryKey: ["upcoming"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const values = {
        title: form.title.trim(),
        type: form.type,
        due_date: form.due_date || null,
        due_time: form.due_time || null,
        weight: form.weight ? Number(form.weight) : null,
        // The app does the maths: the student types "15 out of 20", we store 75%.
        score_percent: percent,
        score_earned: percent !== null ? Number(form.score_earned) : null,
        score_max: percent !== null ? Number(form.score_max) : null,
        drop_lowest: form.drop_lowest,
        description: form.description.trim() || null,
      };
      if (item) {
        const { error } = await supabase.from("course_items").update(values).eq("id", item.id);
        if (error) throw error;
      } else {
        if (!user) throw new Error("no user");
        const { error } = await supabase
          .from("course_items")
          .insert({ ...values, course_id: courseId, user_id: user.id });
        if (error) throw error;
      }
      // "Drop the lowest" applies to a whole group (all quizzes of this course), so keep every
      // sibling of the same type in sync instead of making the student flip it on each one.
      const { error: syncError } = await supabase
        .from("course_items")
        .update({ drop_lowest: form.drop_lowest })
        .eq("course_id", courseId)
        .eq("type", form.type);
      if (syncError) throw syncError;
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success(t("saved"));
    },
    onError: (e: Error) =>
      toast.error(isMissingSchemaError(e) ? t("migrationMissingHint") : t("saveFailed")),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const { error } = await supabase.from("course_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success(t("deleted"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? t("editItem") : t("addItem")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("title")}</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("type")}</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((s) => ({ ...s, type: v as ItemType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((ty) => (
                    <SelectItem key={ty} value={ty}>
                      {t(ty)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("weight")}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="any"
                placeholder={t("weightPlaceholder")}
                value={form.weight}
                onChange={(e) => setForm((s) => ({ ...s, weight: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("dueDate")}</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((s) => ({ ...s, due_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("dueTime")}</Label>
              <Input
                type="time"
                value={form.due_time}
                onChange={(e) => setForm((s) => ({ ...s, due_time: e.target.value }))}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t("weightHint")}</p>
          <div className="space-y-1.5">
            <Label>{t("scoreLabel")}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                aria-label={t("scoreEarned")}
                placeholder={t("scoreEarned")}
                value={form.score_earned}
                onChange={(e) => setForm((s) => ({ ...s, score_earned: e.target.value }))}
              />
              <span className="text-sm text-muted-foreground">{t("outOf")}</span>
              <Input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                aria-label={t("scoreMax")}
                placeholder={t("scoreMax")}
                value={form.score_max}
                onChange={(e) => setForm((s) => ({ ...s, score_max: e.target.value }))}
              />
            </div>
            {scoreInvalid ? (
              <p className="text-xs text-destructive">{t("scoreAboveMax")}</p>
            ) : percent !== null ? (
              <p className="text-xs text-muted-foreground" dir="auto">
                = <span className="font-semibold text-foreground">{percent}%</span>
                {points !== null && weightNum ? (
                  <>
                    {" "}
                    → {t("countsTowardCourse")}{" "}
                    <span className="font-semibold text-accent">
                      {Number(points.toFixed(2))} / {weightNum}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="drop-lowest" className="cursor-pointer">
                {t("dropLowest")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("dropLowestHint")}</p>
            </div>
            <Switch
              id="drop-lowest"
              checked={form.drop_lowest}
              onCheckedChange={(v) => setForm((s) => ({ ...s, drop_lowest: v }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("description")}</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {item ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => remove.mutate()}
            >
              <Trash2 className="size-4" />
              {t("delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={!form.title.trim() || scoreInvalid || save.isPending}
              onClick={() => save.mutate()}
            >
              {t("save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
