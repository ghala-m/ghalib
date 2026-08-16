import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Academic Profile — Ghalib" },
      { name: "description", content: "Manage your major, current term, GPA and completed credits." },
      { property: "og:title", content: "Academic Profile — Ghalib" },
      { property: "og:description", content: "Manage your major, current term, GPA and completed credits." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));

  const [form, setForm] = useState({
    full_name: "",
    major: "",
    current_term: "",
    total_credits: "",
    overall_gpa: "",
    semester_gpa: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      major: profile.major ?? "",
      current_term: profile.current_term ?? "",
      total_credits: profile.total_credits?.toString() ?? "",
      overall_gpa: profile.overall_gpa?.toString() ?? "",
      semester_gpa: profile.semester_gpa?.toString() ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          major: form.major || null,
          current_term: form.current_term || null,
          total_credits: form.total_credits ? Number(form.total_credits) : 0,
          overall_gpa: form.overall_gpa ? Number(form.overall_gpa) : null,
          semester_gpa: form.semester_gpa ? Number(form.semester_gpa) : null,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(t("saved"));
    },
    onError: () => toast.error(t("saveFailed")),
  });

  const fields: { key: keyof typeof form; label: string; type?: string; step?: string }[] = [
    { key: "full_name", label: t("fullName") },
    { key: "major", label: t("major") },
    { key: "current_term", label: t("currentTerm") },
    { key: "total_credits", label: t("totalCredits"), type: "number" },
    { key: "overall_gpa", label: t("overallGpa"), type: "number", step: "0.01" },
    { key: "semester_gpa", label: t("semesterGpa"), type: "number", step: "0.01" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold">{t("profile")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>

      <div className="panel mt-8 space-y-5 p-6">
        {fields.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              type={f.type ?? "text"}
              step={f.step}
              value={form[f.key]}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
