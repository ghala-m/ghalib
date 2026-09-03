import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { primaryNickname, coursesQuery, type CalendarEvent } from "@/lib/queries";
import { requestNotificationPermission } from "@/hooks/useReminders";

const REMINDERS: { value: string; key: "noReminder" | "remind10" | "remind30" | "remind60" | "remind1440" }[] = [
  { value: "none", key: "noReminder" },
  { value: "10", key: "remind10" },
  { value: "30", key: "remind30" },
  { value: "60", key: "remind60" },
  { value: "1440", key: "remind1440" },
];

export function EventDialog({
  event,
  courseId,
  defaultDate,
  trigger,
}: {
  event?: CalendarEvent;
  courseId?: string;
  defaultDate?: string;
  trigger: ReactNode;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: courses = [] } = useQuery(coursesQuery());
  const [form, setForm] = useState({
    title: "",
    event_date: defaultDate ?? "",
    event_time: "",
    remind_minutes: "none",
    course_id: courseId ?? "none",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: event?.title ?? "",
      event_date: event?.event_date ?? defaultDate ?? new Date().toISOString().slice(0, 10),
      event_time: event?.event_time ?? "",
      remind_minutes: event?.remind_minutes ? String(event.remind_minutes) : "none",
      course_id: event?.course_id ?? courseId ?? "none",
      notes: event?.notes ?? "",
    });
  }, [open, event, courseId, defaultDate]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["events"] });

  const save = useMutation({
    mutationFn: async () => {
      const values = {
        title: form.title.trim(),
        event_date: form.event_date,
        event_time: form.event_time || null,
        remind_minutes: form.remind_minutes === "none" ? null : Number(form.remind_minutes),
        course_id: form.course_id === "none" ? null : form.course_id,
        notes: form.notes.trim() || null,
      };
      if (values.remind_minutes) await requestNotificationPermission();
      if (event) {
        const { error } = await supabase.from("calendar_events").update(values).eq("id", event.id);
        if (error) throw error;
      } else {
        if (!user) throw new Error("no user");
        const { error } = await supabase.from("calendar_events").insert({ ...values, user_id: user.id });
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
      if (!event) return;
      const { error } = await supabase.from("calendar_events").delete().eq("id", event.id);
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
          <DialogTitle>{event ? t("editEvent") : t("addEvent")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("eventTitle")}</Label>
            <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("eventDate")}</Label>
              <Input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm((s) => ({ ...s, event_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("eventTime")}</Label>
              <Input
                type="time"
                value={form.event_time}
                onChange={(e) => setForm((s) => ({ ...s, event_time: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("reminder")}</Label>
              <Select value={form.remind_minutes} onValueChange={(v) => setForm((s) => ({ ...s, remind_minutes: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDERS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {t(r.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("linkedCourse")}</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm((s) => ({ ...s, course_id: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noCourseLink")}</SelectItem>
                  {courses
                    .filter((c) => !c.archived)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {primaryNickname(c.nickname) || c.code || c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {event ? (
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
            <Button disabled={!form.title.trim() || !form.event_date || save.isPending} onClick={() => save.mutate()}>
              {t("save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
