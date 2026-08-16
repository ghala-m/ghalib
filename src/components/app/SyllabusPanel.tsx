import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseSyllabus, type Extraction } from "@/lib/syllabus.functions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Course } from "@/lib/queries";

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

const GAP_LABELS: Record<string, string> = {
  course_name: "courseName",
  course_code: "courseCode",
  instructor: "instructor",
  location: "location",
  term: "term",
  credits: "credits",
};

export function SyllabusPanel({ course }: { course: Course }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const parse = useServerFn(parseSyllabus);
  const inputRef = useRef<HTMLInputElement>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [gaps, setGaps] = useState<Record<string, string>>({});

  const run = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await toBase64(file);
      await supabase.storage
        .from("syllabi")
        .upload(`${course.user_id}/${course.id}/${Date.now()}-${file.name}`, file, { upsert: true });
      return (await parse({
        data: { base64, mediaType: file.type || "application/pdf", courseHint: course.name },
      })) as Extraction;
    },
    onSuccess: (data) => setExtraction(data),
    onError: (e: Error) => {
      if (e.message.includes("RATE_LIMIT")) toast.error(t("aiRateLimit"));
      else if (e.message.includes("NO_CREDITS")) toast.error(t("aiCredits"));
      else toast.error(t("aiFailed"));
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!extraction) return;
      const merged = { ...extraction, ...parseGaps(gaps) };
      const { error } = await supabase
        .from("courses")
        .update({
          name: merged.course_name || course.name,
          code: merged.course_code ?? course.code,
          instructor: merged.instructor ?? course.instructor,
          location: merged.location ?? course.location,
          term: merged.term ?? course.term,
          credits: merged.credits ?? course.credits,
          meetings: extraction.meetings,
        })
        .eq("id", course.id);
      if (error) throw error;

      if (extraction.items.length) {
        const { error: itemsError } = await supabase.from("course_items").insert(
          extraction.items.map((i) => ({
            course_id: course.id,
            user_id: course.user_id,
            type: i.type,
            title: i.title,
            description: i.description,
            due_date: i.due_date,
            due_time: i.due_time,
            weight: i.weight,
          })),
        );
        if (itemsError) throw itemsError;
      }
      if (extraction.grade_weights.length) {
        const { error: gwError } = await supabase.from("grade_weights").insert(
          extraction.grade_weights.map((g) => ({
            course_id: course.id,
            user_id: course.user_id,
            category: g.category,
            percentage: g.percentage,
          })),
        );
        if (gwError) throw gwError;
      }
    },
    onSuccess: () => {
      setExtraction(null);
      setGaps({});
      qc.invalidateQueries({ queryKey: ["course", course.id] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["upcoming"] });
      toast.success(t("saved"));
    },
    onError: () => toast.error(t("saveFailed")),
  });

  const askable = (extraction?.missing_fields ?? []).filter((f) => GAP_LABELS[f]);

  return (
    <div className="panel p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-4 text-accent" />
        {t("syllabus")}
      </h2>

      {!extraction ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t("uploadSyllabus")}</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) run.mutate(file);
              e.target.value = "";
            }}
          />
          <Button className="mt-4" disabled={run.isPending} onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" />
            {run.isPending ? t("analyzing") : t("uploadSyllabus")}
          </Button>
        </>
      ) : (
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-sm font-medium">{t("reviewExtraction")}</p>
            <p className="text-xs text-muted-foreground">{t("reviewHint")}</p>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Row label={t("courseName")} value={extraction.course_name} />
            <Row label={t("courseCode")} value={extraction.course_code} />
            <Row label={t("instructor")} value={extraction.instructor} />
            <Row label={t("location")} value={extraction.location} />
            <Row label={t("term")} value={extraction.term} />
            <Row label={t("credits")} value={extraction.credits?.toString() ?? null} />
          </dl>

          <p className="text-xs text-muted-foreground">
            {extraction.items.length} · {t("checklist")} — {extraction.grade_weights.length} · {t("gradeWeights")}
          </p>

          {askable.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm font-medium">{t("gapsTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("gapsHint")}</p>
              <div className="mt-3 space-y-3">
                {askable.map((f) => (
                  <div key={f} className="space-y-1.5">
                    <Label htmlFor={`gap-${f}`} className="text-xs">
                      {t(GAP_LABELS[f] as never)}
                    </Label>
                    <Input
                      id={`gap-${f}`}
                      value={gaps[f] ?? ""}
                      onChange={(e) => setGaps((s) => ({ ...s, [f]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
              {t("applyExtraction")}
            </Button>
            <Button variant="outline" onClick={() => setExtraction(null)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function parseGaps(gaps: Record<string, string>) {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(gaps)) {
    if (!v.trim()) continue;
    out[k] = k === "credits" ? Number(v) : v.trim();
  }
  return out as Partial<Extraction>;
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value || "—"}</dd>
    </div>
  );
}
