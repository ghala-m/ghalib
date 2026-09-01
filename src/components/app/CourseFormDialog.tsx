import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { CATEGORY_META, CATEGORY_ORDER, GRADE_SCALE } from "@/lib/plan";
import { useAuth } from "@/hooks/useAuth";
import { coursesQuery, type Course, type CourseCategory, type CourseStatus } from "@/lib/queries";

type FormState = {
  name: string;
  code: string;
  nickname: string;
  instructor: string;
  location: string;
  term: string;
  credits: string;
  status: CourseStatus;
  category: CourseCategory;
  prerequisites: string;
  alt_group: string;
  final_grade: string;
  notes: string;
  is_retake: boolean;
  previous_attempt_id: string;
};

const empty: FormState = {
  name: "",
  code: "",
  nickname: "",
  instructor: "",
  location: "",
  term: "",
  credits: "",
  status: "current",
  category: "general",
  prerequisites: "",
  alt_group: "",
  final_grade: "",
  notes: "",
  is_retake: false,
  previous_attempt_id: "",
};

function fromCourse(c: Course): FormState {
  return {
    name: c.name,
    code: c.code ?? "",
    nickname: c.nickname ?? "",
    instructor: c.instructor ?? "",
    location: c.location ?? "",
    term: c.term ?? "",
    credits: c.credits?.toString() ?? "",
    status: c.status,
    category: c.category,
    prerequisites: (c.prerequisites ?? []).join(", "),
    alt_group: c.alt_group ?? "",
    final_grade: c.final_grade ?? "",
    notes: c.notes ?? "",
    is_retake: c.is_retake,
    previous_attempt_id: c.previous_attempt_id ?? "",
  };
}

export function CourseFormDialog({ course, trigger }: { course?: Course; trigger: ReactNode }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(course ? fromCourse(course) : empty);
  const { data: allCourses = [] } = useQuery(coursesQuery());

  useEffect(() => {
    if (open) setForm(course ? fromCourse(course) : empty);
  }, [open, course]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((s) => ({ ...s, [k]: v }));

  const payload = () => ({
    name: form.name.trim(),
    code: form.code.trim() || null,
    nickname: form.nickname.trim() || null,
    instructor: form.instructor.trim() || null,
    location: form.location.trim() || null,
    term: form.term.trim() || null,
    credits: form.credits ? Number(form.credits) : null,
    status: form.status,
    category: form.category,
    prerequisites: form.prerequisites
      .split(/[,،]/)
      .map((p) => p.trim())
      .filter(Boolean),
    alt_group: form.alt_group.trim() || null,
    final_grade: form.final_grade.trim() || null,
    notes: form.notes.trim() || null,
    is_retake: form.is_retake,
    previous_attempt_id: form.is_retake ? form.previous_attempt_id || null : null,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["courses"] });
    if (course) qc.invalidateQueries({ queryKey: ["course", course.id] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (course) {
        const { error } = await supabase.from("courses").update(payload()).eq("id", course.id);
        if (error) throw error;
        return course.id;
      }
      if (!user) throw new Error("no user");
      const { data, error } = await supabase
        .from("courses")
        .insert({ ...payload(), user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      invalidate();
      setOpen(false);
      toast.success(t("saved"));
      if (!course) navigate({ to: "/courses/$courseId", params: { courseId: id } });
    },
    onError: () => toast.error(t("saveFailed")),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!course) return;
      const { error } = await supabase.from("courses").delete().eq("id", course.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success(t("deleted"));
      navigate({ to: "/dashboard" });
    },
    onError: () => toast.error(t("saveFailed")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{course ? t("editCourse") : t("addCourse")}</DialogTitle>
          <DialogDescription>{t("nicknameHint")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label={t("courseName")}>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("courseCode")}>
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
            </Field>
            <Field label={t("nickname")}>
              <Input value={form.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder="Calc I" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("status")}>
              <Select value={form.status} onValueChange={(v) => set("status", v as CourseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">{t("current")}</SelectItem>
                  <SelectItem value="completed">{t("completed")}</SelectItem>
                  <SelectItem value="future">{t("future")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("category")}>
              <Select value={form.category} onValueChange={(v) => set("category", v as CourseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <span className="flex items-center gap-2">
                        <i className="size-2.5 rounded-full" style={{ background: CATEGORY_META[cat].color }} />
                        {t(CATEGORY_META[cat].key)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t("term")}>
              <Input value={form.term} onChange={(e) => set("term", e.target.value)} />
            </Field>
            <Field label={t("credits")}>
              <Input type="number" min={0} value={form.credits} onChange={(e) => set("credits", e.target.value)} />
            </Field>
            <Field label={t("finalGrade")}>
              <Select value={form.final_grade || "none"} onValueChange={(v) => set("final_grade", v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {GRADE_SCALE.map((g) => (
                    <SelectItem key={g.grade} value={g.grade}>
                      {g.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("instructor")}>
              <Input value={form.instructor} onChange={(e) => set("instructor", e.target.value)} />
            </Field>
            <Field label={t("location")}>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
          </div>

          <Field label={t("prerequisites")} hint="MATH101, PHYS102">
            <Input value={form.prerequisites} onChange={(e) => set("prerequisites", e.target.value)} />
          </Field>

          <Field label={t("altGroup")} hint={t("altGroupHint")}>
            <Input value={form.alt_group} onChange={(e) => set("alt_group", e.target.value)} placeholder="GEN-HUM" />
          </Field>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.is_retake} onCheckedChange={(v) => set("is_retake", !!v)} />
              {t("isRetake")}
            </label>
            {form.is_retake && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium">{t("previousAttempt")}</Label>
                <Select
                  value={form.previous_attempt_id || "none"}
                  onValueChange={(v) => set("previous_attempt_id", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("previousAttempt")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {allCourses
                      .filter((c) => c.id !== course?.id && c.status === "completed")
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code ? `${c.code} · ` : ""}
                          {c.name} {c.final_grade ? `(${c.final_grade})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">{t("previousAttemptHint")}</p>
              </div>
            )}
          </div>

          <Field label={t("notes")}>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {course ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (window.confirm(t("deleteConfirm"))) remove.mutate();
              }}
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
            <Button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
              {course ? t("save") : t("create")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
