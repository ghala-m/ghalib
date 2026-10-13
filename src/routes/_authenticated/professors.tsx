import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Flag, GraduationCap, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { professorsQuery, professorReviewsQuery, professorSummaryQuery } from "@/lib/professors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/professors")({
  head: () => ({ meta: [
    { title: "Professor ratings — Ghalib" },
    { name: "description", content: "Share course experiences and browse student ratings of university professors on Ghalib." },
    { property: "og:title", content: "Professor ratings — Ghalib" },
    { property: "og:description", content: "Student experiences and university professor ratings." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProfessorsPage,
});

function ProfessorsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const professors = useQuery(professorsQuery());
  const summary = useQuery(professorSummaryQuery());
  const [selected, setSelected] = useState("");
  const reviews = useQuery(professorReviewsQuery(selected));
  const professor = professors.data?.find(p => p.id === selected);
  const [search, setSearch] = useState("");
  const [university, setUniversity] = useState("");
  const [adding, setAdding] = useState(false);
  const [newProfessor, setNewProfessor] = useState({ name: "", university: "", department: "" });
  const [review, setReview] = useState({ rating: 0, course_name: "", comment: "", is_anonymous: true });
  const [reportId, setReportId] = useState("");
  const [reason, setReason] = useState("");
  const own = reviews.data?.find(r => r.is_own);
  useEffect(() => {
    setReview(own ? { rating: own.rating, course_name: own.course_name, comment: own.comment, is_anonymous: own.is_anonymous } : { rating: 0, course_name: "", comment: "", is_anonymous: true });
  }, [selected, own]);
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["professors"] }),
      qc.invalidateQueries({ queryKey: ["professor-summary"] }),
      qc.invalidateQueries({ queryKey: ["professor-reviews"] }),
    ]);
  };
  const add = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t("signIn"));
      const { data, error } = await supabase.from("professors").insert({ name: newProfessor.name.trim(), university: newProfessor.university.trim(), department: newProfessor.department.trim(), created_by: user.id }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: async data => { await refresh(); setSelected(data.id); setAdding(false); setNewProfessor({ name: "", university: "", department: "" }); },
    onError: () => toast.error(t("saveFailed")),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!user || !selected) throw new Error(t("signIn"));
      if (!review.rating || review.comment.trim().length < 10) throw new Error(t("reviewValidation"));
      const { error } = await supabase.from("professor_reviews").upsert({ professor_id: selected, user_id: user.id, ...review, comment: review.comment.trim(), course_name: review.course_name.trim() }, { onConflict: "professor_id,user_id" });
      if (error) throw error;
    },
    onSuccess: async () => { await refresh(); toast.success(t("reviewSaved")); },
    onError: e => toast.error(e.message === t("reviewValidation") ? e.message : t("saveFailed")),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error(t("signIn"));
      const { error } = await supabase.from("professor_reviews").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    }, onSuccess: refresh, onError: () => toast.error(t("saveFailed")),
  });
  const report = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t("signIn"));
      const { error } = await supabase.from("professor_review_reports").insert({ user_id: user.id, review_id: reportId, reason: reason.trim() });
      if (error) throw error;
    }, onSuccess: () => { setReportId(""); setReason(""); toast.success(t("reportSent")); }, onError: () => toast.error(t("saveFailed")),
  });
  const filtered = professors.data?.filter(p => (!university || p.university === university) && `${p.name} ${p.university} ${p.department}`.toLowerCase().includes(search.trim().toLowerCase())) ?? [];

  return <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><GraduationCap className="size-6 text-accent" />{t("professorForum")}</h1>
      <Button onClick={() => setAdding(true)}><Plus className="size-4" />{t("addProfessor")}</Button>
    </header>
    {professors.isError || summary.isError ? <div role="alert" className="space-y-3 text-destructive"><p>{t("loadFailed")}</p><Button variant="outline" onClick={() => void refresh()}>{t("next")}</Button></div> : professors.isPending ? <Loader2 aria-label={t("loading")} className="size-5 animate-spin" /> : professor ? <>
      <Button variant="ghost" onClick={() => setSelected("")} className="mb-4"><ArrowRight className="size-4" />{t("prev")}</Button>
      <h2 className="text-xl font-semibold">{professor.name}</h2><p className="mt-1 text-sm text-muted-foreground">{professor.university} · {professor.department}</p>
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0 space-y-4">
          {reviews.isPending ? <Loader2 className="size-5 animate-spin" /> : reviews.isError ? <p role="alert">{t("loadFailed")}</p> : reviews.data?.length ? reviews.data.map(r => <article key={r.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2"><span className="font-medium">{r.is_anonymous ? t("anonymousStudent") : r.author_name === "Student" ? t("namedStudent") : r.author_name}</span><span className="flex items-center gap-1 text-accent"><Star className="size-4 fill-current" />{r.rating}/5</span></div>
            <p className="mt-1 text-xs text-muted-foreground">{r.course_name} · {new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar-KW" : "en-GB")}</p>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{r.comment}</p>
            <div className="mt-2 flex justify-end"><Button variant="ghost" size="icon" title={t(r.is_own ? "remove" : "reportReview")} aria-label={t(r.is_own ? "remove" : "reportReview")} disabled={remove.isPending} onClick={() => r.is_own ? remove.mutate(r.id) : setReportId(r.id)}>{r.is_own ? <Trash2 className="size-4" /> : <Flag className="size-4" />}</Button></div>
          </article>) : <p className="text-sm text-muted-foreground">{t("noReviews")}</p>}
        </section>
        <form className="min-w-0 space-y-4 border-t border-border pt-4 lg:border-t-0 lg:pt-0" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
          <h3 className="font-semibold">{t("writeReview")}</h3>
          <div className="flex gap-1" role="group" aria-label={t("writeReview")}>{[1,2,3,4,5].map(n => <Button key={n} type="button" variant="ghost" size="icon" aria-label={`${n}/5`} aria-pressed={review.rating === n} onClick={() => setReview(r => ({ ...r, rating: n }))}><Star className={cn("size-6", n <= review.rating ? "fill-current text-accent" : "text-muted-foreground")} /></Button>)}</div>
          <div className="space-y-2"><Label htmlFor="review-course">{t("reviewCourse")}</Label><Input id="review-course" maxLength={160} value={review.course_name} onChange={e => setReview(r => ({ ...r, course_name: e.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="review-comment">{t("reviewComment")}</Label><Textarea id="review-comment" required minLength={10} maxLength={2000} rows={5} value={review.comment} onChange={e => setReview(r => ({ ...r, comment: e.target.value }))} /></div>
          <div className="flex items-center justify-between gap-2"><Label htmlFor="review-anonymous">{t("anonymousReview")}</Label><Switch id="review-anonymous" checked={review.is_anonymous} onCheckedChange={v => setReview(r => ({ ...r, is_anonymous: v }))} /></div>
          <Button type="submit" disabled={save.isPending || reviews.isPending || reviews.isError}>{save.isPending && <Loader2 className="size-4 animate-spin" />}{t(own ? "save" : "publishReview")}</Button>
        </form>
      </div>
    </> : <>
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_240px]"><Input aria-label={t("searchProfessors")} placeholder={t("searchProfessors")} value={search} onChange={e => setSearch(e.target.value)} /><select aria-label={t("university")} className="h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm" value={university} onChange={e => setUniversity(e.target.value)}><option value="">{t("university")}</option>{[...new Set(professors.data?.map(p => p.university))].sort().map(u => <option key={u}>{u}</option>)}</select></div>
      {filtered.length ? <div className="grid gap-4 sm:grid-cols-2">{filtered.map(p => { const stat = summary.data?.find(s => s.professor_id === p.id); return <Button key={p.id} variant="outline" className="h-auto min-w-0 justify-start whitespace-normal p-5 text-start" onClick={() => setSelected(p.id)}><div className="min-w-0"><h2 className="break-words text-base font-semibold">{p.name}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{p.university} · {p.department}</p><p className="mt-3 flex items-center gap-2 text-accent"><Star className="size-4 fill-current" />{stat?.average_rating ?? "—"}<span className="text-xs text-muted-foreground">({stat?.review_count ?? 0} {t("reviewCount")})</span></p></div></Button>; })}</div> : <p className="py-10 text-center text-muted-foreground">{t("noProfessors")}</p>}
    </>}
    <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogHeader><DialogTitle>{t("addProfessor")}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); add.mutate(); }}>{(["name","university","department"] as const).map((key,i) => <div key={key} className="space-y-2"><Label htmlFor={`professor-${key}`}>{[t("professorName"),t("university"),t("departmentLabel")][i]}</Label><Input id={`professor-${key}`} required={key !== "department"} minLength={key === "department" ? 0 : 2} maxLength={key === "name" ? 120 : 160} value={newProfessor[key]} onChange={e => setNewProfessor(p => ({ ...p, [key]: e.target.value }))} /></div>)}<Button type="submit" disabled={add.isPending}>{add.isPending && <Loader2 className="size-4 animate-spin" />}{t("addProfessor")}</Button></form></DialogContent></Dialog>
    <Dialog open={Boolean(reportId)} onOpenChange={v => { if (!v) { setReportId(""); setReason(""); } }}><DialogContent><DialogHeader><DialogTitle>{t("reportReview")}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); report.mutate(); }}><Label htmlFor="report-reason">{t("reportReason")}</Label><Textarea id="report-reason" required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /><Button type="submit" disabled={report.isPending}>{t("reportReview")}</Button></form></DialogContent></Dialog>
  </div>;
}