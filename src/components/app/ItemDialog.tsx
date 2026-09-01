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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
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
    score_percent: "",
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
      score_percent: item?.score_percent?.toString() ?? "",
      description: item?.description ?? "",
    });
  }, [open, item, defaultDate]);

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
        score_percent: form.score_percent ? Math.min(100, Math.max(0, Number(form.score_percent))) : null,
        description: form.description.trim() || null,
      };
      if (item) {
        const { error } = await supabase.from("course_items").update(values).eq("id", item.id);
        if (error) throw error;
      } else {
        if (!user) throw new Error("no user");
        const { error } = await supabase.from("course_items").insert({ ...values, course_id: courseId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success(t("saved"));
    },
    onError: () => toast.error(t("saveFailed")),
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
            <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("type")}</Label>
              <Select value={form.type} onValueChange={(v) => setForm((s) => ({ ...s, type: v as ItemType }))}>
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
          <div className="max-w-[calc(50%-0.375rem)] space-y-1.5">
            <Label>{t("scoreLabel")}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder={t("scorePlaceholder")}
              value={form.score_percent}
              onChange={(e) => setForm((s) => ({ ...s, score_percent: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("description")}</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {item ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove.mutate()}>
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
            <Button disabled={!form.title.trim() || save.isPending} onClick={() => save.mutate()}>
              {t("save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
