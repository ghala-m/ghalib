import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Pencil, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { courseQuery, meetingsOf } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { SyllabusPanel } from "@/components/app/SyllabusPanel";
import { CourseFormDialog } from "@/components/app/CourseFormDialog";
import { CalendarView } from "@/components/app/CalendarView";
import { ItemDialog } from "@/components/app/ItemDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Course workspace — Ghalib" },
      { name: "description", content: "Checklist, timeline, grade weights and logistics for this course." },
      { property: "og:title", content: "Course workspace — Ghalib" },
      { property: "og:description", content: "Checklist, timeline, grade weights and logistics for this course." },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = useParams({ from: "/_authenticated/courses/$courseId" });
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery(courseQuery(courseId));
  const course = data?.course;
  const items = data?.items ?? [];
  const weights = data?.weights ?? [];

  const toggle = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("course_items").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["upcoming"] });
    },
    onError: () => toast.error(t("saveFailed")),
  });

  if (!course) {
    return <div className="p-10 text-sm text-muted-foreground">{t("loading")}</div>;
  }

  const done = items.filter((i) => i.completed).length;
  const meetings = meetingsOf(course);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
        <p className="text-xs text-muted-foreground">
          {course.code || t("none")}
          {course.nickname ? ` · ${course.nickname}` : ""}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{course.name}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-4" />
            {course.instructor || t("none")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" />
            {course.location || t("none")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {course.term || t("none")}
          </span>
        </div>
        </div>
        <CourseFormDialog
          course={course}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil className="size-4" />
              {t("edit")}
            </Button>
          }
        />
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SyllabusPanel course={course} />

        <div className="panel p-6">
          <h2 className="font-semibold">{t("gradeWeights")}</h2>
          {weights.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("none")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {weights.map((w) => (
                <li key={w.id}>
                  <div className="flex justify-between text-sm">
                    <span>{w.category}</span>
                    <span className="tabular-nums">{w.percentage}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-accent"
                      style={{ width: `${Math.min(100, Number(w.percentage))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">{t("courseCalendar")}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("courseCalendarHint")}</p>
        <CalendarView courseId={courseId} />
      </section>

      <section className="panel mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("checklist")}</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {done}/{items.length} · {t("overallProgress")}
            </span>
            <ItemDialog
              courseId={courseId}
              trigger={
                <Button size="sm" variant="outline">
                  {t("addItem")}
                </Button>
              }
            />
          </div>
        </div>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("nothingUpcoming")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <Checkbox
                  checked={i.completed}
                  onCheckedChange={(v) => toggle.mutate({ id: i.id, completed: v === true })}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${i.completed ? "text-muted-foreground line-through" : ""}`}>
                    {i.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(i.type)}
                    {i.weight ? ` · ${i.weight}%` : ""}
                  </p>
                </div>
                <ItemDialog
                  courseId={courseId}
                  item={i}
                  trigger={
                    <Button variant="ghost" size="sm" className="shrink-0 text-xs">
                      {t("edit")}
                    </Button>
                  }
                />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {i.due_date
                    ? new Date(i.due_date).toLocaleDateString(lang === "ar" ? "ar" : "en-GB", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {meetings.length > 0 && (
        <section className="panel mt-6 p-6">
          <h2 className="font-semibold">{t("meetings")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {meetings.map((m, idx) => (
              <li key={idx} className="flex justify-between rounded-md bg-muted/40 px-3 py-2">
                <span>{m.day}</span>
                <span className="text-muted-foreground">
                  {[m.start_time, m.end_time].filter(Boolean).join(" – ") || "—"} {m.location ? `· ${m.location}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
