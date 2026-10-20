import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  Flag,
  GraduationCap,
  Loader2,
  MessageSquareText,
  Plus,
  Search,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { profileQuery } from "@/lib/queries";
import { professorsQuery, professorReviewsQuery, professorSummaryQuery } from "@/lib/professors";
import { COLLEGES, collegeLabel, collegeStyle, sameUniversity } from "@/lib/colleges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/professors")({
  head: () => ({
    meta: [
      { title: "Professor ratings — Ghalib" },
      {
        name: "description",
        content:
          "Share course experiences and browse student ratings of university professors on Ghalib.",
      },
      { property: "og:title", content: "Professor ratings — Ghalib" },
      {
        property: "og:description",
        content: "Student experiences and university professor ratings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfessorsPage,
});

const COPY = {
  ar: {
    college: "الكلية",
    allColleges: "كل الكليات",
    yourUniversity: "جامعتك",
    setUniversity: "حدّد جامعتك من الملف الأكاديمي ليعرض لك المنتدى دكاترة جامعتك تلقائياً.",
    setUniversityLink: "فتح الملف الأكاديمي",
    heroHint: "تجارب الطلاب الحقيقية مع دكاترة جامعتك — شارك تجربتك وساعد زملاءك على اختيار شعبهم.",
    back: "كل الدكاترة",
    reviewsTitle: "تقييمات الطلاب",
    distribution: "توزيع التقييمات",
    pickCollege: "اختر الكلية",
    universityFallback: "الجامعة",
    emptyFiltered: "لا يوجد دكاترة في هذه الكلية بعد. كن أول من يضيف!",
    avg: "المتوسط",
    count: "تقييم",
    noRating: "بدون تقييم",
  },
  en: {
    college: "College",
    allColleges: "All colleges",
    yourUniversity: "Your university",
    setUniversity:
      "Set your university in your academic profile and the forum will show your university's professors automatically.",
    setUniversityLink: "Open academic profile",
    heroHint:
      "Real student experiences with your university's professors — share yours and help classmates pick their sections.",
    back: "All professors",
    reviewsTitle: "Student reviews",
    distribution: "Rating breakdown",
    pickCollege: "Choose a college",
    universityFallback: "University",
    emptyFiltered: "No professors in this college yet. Be the first to add one!",
    avg: "Average",
    count: "reviews",
    noRating: "Not rated",
  },
} as const;

const AVATAR_GRADIENTS = [
  "from-sky-500 to-blue-600",
  "from-amber-400 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-fuchsia-600",
  "from-rose-500 to-pink-600",
  "from-lime-500 to-green-600",
] as const;

function hashIndex(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % AVATAR_GRADIENTS.length;
}

function initials(name: string) {
  const parts = name
    .replace(/^(د\.|dr\.?|prof\.?|أ\.د\.?)\s*/i, "")
    .trim()
    .split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "؟";
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-4",
            value >= n - 0.25
              ? "fill-amber-400 text-amber-400"
              : value >= n - 0.75
                ? "fill-amber-400/50 text-amber-400"
                : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

function ProfessorsPage() {
  const { t, lang } = useI18n();
  const c = COPY[lang];
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const myUniversity = (profile?.university ?? "").trim();

  const professors = useQuery(professorsQuery());
  const summary = useQuery(professorSummaryQuery());
  const [selected, setSelected] = useState("");
  const reviews = useQuery(professorReviewsQuery(selected));
  const professor = professors.data?.find((p) => p.id === selected);
  const [search, setSearch] = useState("");
  const [college, setCollege] = useState("");
  const [adding, setAdding] = useState(false);
  const [newProfessor, setNewProfessor] = useState({ name: "", university: "", department: "" });
  const [review, setReview] = useState({
    rating: 0,
    course_name: "",
    comment: "",
    is_anonymous: true,
  });
  const [reportId, setReportId] = useState("");
  const [reason, setReason] = useState("");
  const own = reviews.data?.find((r) => r.is_own);

  useEffect(() => {
    setReview(
      own
        ? {
            rating: own.rating,
            course_name: own.course_name,
            comment: own.comment,
            is_anonymous: own.is_anonymous,
          }
        : { rating: 0, course_name: "", comment: "", is_anonymous: true },
    );
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
      // University is assigned automatically from the student's profile.
      const university = (myUniversity || newProfessor.university).trim();
      const { data, error } = await supabase
        .from("professors")
        .insert({
          name: newProfessor.name.trim(),
          university,
          department: newProfessor.department.trim(),
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await refresh();
      setSelected(data.id);
      setAdding(false);
      setNewProfessor({ name: "", university: "", department: "" });
    },
    onError: () => toast.error(t("saveFailed")),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user || !selected) throw new Error(t("signIn"));
      if (!review.rating || review.comment.trim().length < 10)
        throw new Error(t("reviewValidation"));
      const { error } = await supabase
        .from("professor_reviews")
        .upsert(
          {
            professor_id: selected,
            user_id: user.id,
            ...review,
            comment: review.comment.trim(),
            course_name: review.course_name.trim(),
          },
          { onConflict: "professor_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success(t("reviewSaved"));
    },
    onError: (e) => toast.error(e.message === t("reviewValidation") ? e.message : t("saveFailed")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error(t("signIn"));
      const { error } = await supabase
        .from("professor_reviews")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: () => toast.error(t("saveFailed")),
  });

  const report = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t("signIn"));
      const { error } = await supabase
        .from("professor_review_reports")
        .insert({ user_id: user.id, review_id: reportId, reason: reason.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setReportId("");
      setReason("");
      toast.success(t("reportSent"));
    },
    onError: () => toast.error(t("saveFailed")),
  });

  // Only the student's own university is listed (when known); otherwise everything is shown.
  const scoped = useMemo(
    () =>
      (professors.data ?? []).filter(
        (p) => !myUniversity || sameUniversity(p.university, myUniversity),
      ),
    [professors.data, myUniversity],
  );

  const collegeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of scoped) {
      const key = p.department.trim();
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [scoped]);

  // Colleges that actually have professors first, then the standard list for easy adding.
  const collegeChips = useMemo(
    () =>
      [...collegeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })),
    [collegeCounts],
  );

  const filtered = scoped.filter(
    (p) =>
      (!college || p.department.trim() === college) &&
      `${p.name} ${p.department} ${collegeLabel(p.department, lang)}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  const distribution = useMemo(() => {
    const d = [0, 0, 0, 0, 0];
    for (const r of reviews.data ?? []) d[Math.min(5, Math.max(1, r.rating)) - 1]!++;
    return d;
  }, [reviews.data]);
  const reviewTotal = reviews.data?.length ?? 0;
  const reviewAvg = reviewTotal
    ? (reviews.data ?? []).reduce((s, r) => s + r.rating, 0) / reviewTotal
    : 0;

  return (
    <div className="surface-gradient min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {/* hero */}
        <header className="mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/20 via-card to-primary/10 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg">
                <GraduationCap className="size-6" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  {t("professorForum")}
                </h1>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">{c.heroHint}</p>
              </div>
            </div>
            <Button size="lg" onClick={() => setAdding(true)} className="rounded-2xl shadow-md">
              <Plus className="size-4" />
              {t("addProfessor")}
            </Button>
          </div>
          <div className="mt-4">
            {myUniversity ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 text-sm font-medium">
                <Building2 className="size-4 text-accent" />
                {c.yourUniversity}: {myUniversity}
              </span>
            ) : (
              <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                {c.setUniversity}{" "}
                <Link to="/profile" className="font-semibold text-accent underline">
                  {c.setUniversityLink}
                </Link>
              </p>
            )}
          </div>
        </header>

        {professors.isError || summary.isError ? (
          <div role="alert" className="space-y-3 text-destructive">
            <p>{t("loadFailed")}</p>
            <Button variant="outline" onClick={() => void refresh()}>
              {t("next")}
            </Button>
          </div>
        ) : professors.isPending ? (
          <Loader2 aria-label={t("loading")} className="size-5 animate-spin" />
        ) : professor ? (
          <>
            <Button variant="ghost" onClick={() => setSelected("")} className="mb-4">
              <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
              {c.back}
            </Button>

            <div className="panel overflow-hidden p-0">
              <div className="bg-gradient-to-br from-accent/20 via-transparent to-transparent p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <span
                    className={cn(
                      "flex size-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br text-xl font-bold text-white shadow-lg",
                      AVATAR_GRADIENTS[hashIndex(professor.name)],
                    )}
                  >
                    {initials(professor.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold sm:text-2xl">{professor.name}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{professor.university}</span>
                      {professor.department && (
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                            collegeStyle(professor.department).chip,
                          )}
                        >
                          {collegeLabel(professor.department, lang)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-bold tabular-nums">
                      {reviewTotal ? reviewAvg.toFixed(1) : "—"}
                    </p>
                    <Stars value={reviewAvg} />
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {reviewTotal} {c.count}
                    </p>
                  </div>
                </div>
                {reviewTotal > 0 && (
                  <div className="mt-5 grid gap-1.5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <div key={n} className="flex items-center gap-2 text-xs">
                        <span className="flex w-6 items-center gap-0.5 tabular-nums">
                          {n}
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                            style={{ width: `${(distribution[n - 1]! / reviewTotal) * 100}%` }}
                          />
                        </span>
                        <span className="w-6 text-end tabular-nums text-muted-foreground">
                          {distribution[n - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
              <section className="min-w-0 space-y-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <MessageSquareText className="size-4 text-accent" />
                  {c.reviewsTitle}
                </h3>
                {reviews.isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : reviews.isError ? (
                  <p role="alert">{t("loadFailed")}</p>
                ) : reviews.data?.length ? (
                  reviews.data.map((r) => (
                    <article key={r.id} className={cn("panel p-4", r.is_own && "border-accent/50")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                            <UserRound className="size-4 text-muted-foreground" />
                          </span>
                          {r.is_anonymous
                            ? t("anonymousStudent")
                            : r.author_name === "Student"
                              ? t("namedStudent")
                              : r.author_name}
                        </span>
                        <Stars value={r.rating} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {r.course_name && (
                          <span className="me-2 rounded-md bg-secondary px-2 py-0.5 font-medium">
                            {r.course_name}
                          </span>
                        )}
                        {new Date(r.created_at).toLocaleDateString(
                          lang === "ar" ? "ar-KW" : "en-GB",
                        )}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {r.comment}
                      </p>
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t(r.is_own ? "remove" : "reportReview")}
                          aria-label={t(r.is_own ? "remove" : "reportReview")}
                          disabled={remove.isPending}
                          onClick={() => (r.is_own ? remove.mutate(r.id) : setReportId(r.id))}
                        >
                          {r.is_own ? <Trash2 className="size-4" /> : <Flag className="size-4" />}
                        </Button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="panel p-6 text-center text-sm text-muted-foreground">
                    {t("noReviews")}
                  </p>
                )}
              </section>

              <form
                className="panel min-w-0 space-y-4 border-t-4 border-accent p-5 lg:sticky lg:top-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate();
                }}
              >
                <h3 className="font-semibold">{t("writeReview")}</h3>
                <div
                  className="flex justify-center gap-1 rounded-2xl bg-muted/50 p-2"
                  role="group"
                  aria-label={t("writeReview")}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${n}/5`}
                      aria-pressed={review.rating === n}
                      onClick={() => setReview((r) => ({ ...r, rating: n }))}
                      className="rounded-lg p-1 transition-transform hover:scale-125"
                    >
                      <Star
                        className={cn(
                          "size-8",
                          n <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/40",
                        )}
                      />
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-course">{t("reviewCourse")}</Label>
                  <Input
                    id="review-course"
                    maxLength={160}
                    value={review.course_name}
                    onChange={(e) => setReview((r) => ({ ...r, course_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-comment">{t("reviewComment")}</Label>
                  <Textarea
                    id="review-comment"
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={5}
                    value={review.comment}
                    onChange={(e) => setReview((r) => ({ ...r, comment: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="review-anonymous">{t("anonymousReview")}</Label>
                  <Switch
                    id="review-anonymous"
                    checked={review.is_anonymous}
                    onCheckedChange={(v) => setReview((r) => ({ ...r, is_anonymous: v }))}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={save.isPending || reviews.isPending || reviews.isError}
                >
                  {save.isPending && <Loader2 className="size-4 animate-spin" />}
                  {t(own ? "save" : "publishReview")}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <>
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={t("searchProfessors")}
                placeholder={t("searchProfessors")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 rounded-2xl ps-9"
              />
            </div>

            {/* college filter chips replace the old university dropdown */}
            <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-2">
              <button
                type="button"
                onClick={() => setCollege("")}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  !college
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-accent/60",
                )}
              >
                {c.allColleges} · {scoped.length}
              </button>
              {collegeChips.map(({ name, n }) => {
                const st = collegeStyle(name);
                const active = college === name;
                return (
                  <button
                    key={name || "none"}
                    type="button"
                    onClick={() => setCollege(active ? "" : name)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "border-transparent bg-primary text-primary-foreground"
                        : cn("hover:brightness-95", st.chip),
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        active ? "bg-primary-foreground" : st.dot,
                      )}
                    />
                    {name ? collegeLabel(name, lang) : "—"} · {n}
                  </button>
                );
              })}
            </div>

            {filtered.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((p) => {
                  const stat = summary.data?.find((s) => s.professor_id === p.id);
                  const avg = stat?.average_rating != null ? Number(stat.average_rating) : 0;
                  const st = collegeStyle(p.department);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelected(p.id)}
                      className="panel group flex min-w-0 items-start gap-4 p-4 text-start transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg"
                    >
                      <span
                        className={cn(
                          "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white shadow-md transition-transform group-hover:rotate-6",
                          AVATAR_GRADIENTS[hashIndex(p.name)],
                        )}
                      >
                        {initials(p.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-base font-semibold">{p.name}</span>
                        {p.department && (
                          <span
                            className={cn(
                              "mt-1.5 inline-block max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                              st.chip,
                            )}
                          >
                            {collegeLabel(p.department, lang)}
                          </span>
                        )}
                        <span className="mt-3 flex items-center gap-2">
                          <Stars value={avg} />
                          <span className="text-sm font-bold tabular-nums">
                            {avg ? avg.toFixed(1) : c.noRating}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({stat?.review_count ?? 0} {t("reviewCount")})
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="panel py-10 text-center text-muted-foreground">
                {college ? c.emptyFiltered : t("noProfessors")}
              </p>
            )}
          </>
        )}

        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addProfessor")}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                add.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="professor-name">{t("professorName")}</Label>
                <Input
                  id="professor-name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={newProfessor.name}
                  onChange={(e) => setNewProfessor((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{c.college}</Label>
                <Select
                  value={newProfessor.department}
                  onValueChange={(v) => setNewProfessor((p) => ({ ...p, department: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={c.pickCollege} />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGES.map((col) => (
                      <SelectItem key={col.ar} value={col.ar}>
                        {col[lang]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* The university is filled in automatically from the profile; only ask if it's missing. */}
              {myUniversity ? (
                <p className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <Building2 className="size-4" />
                  {myUniversity}
                </p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="professor-university">{c.universityFallback}</Label>
                  <Input
                    id="professor-university"
                    required
                    minLength={2}
                    maxLength={160}
                    value={newProfessor.university}
                    onChange={(e) => setNewProfessor((p) => ({ ...p, university: e.target.value }))}
                  />
                </div>
              )}
              <Button type="submit" disabled={add.isPending || !newProfessor.department}>
                {add.isPending && <Loader2 className="size-4 animate-spin" />}
                {t("addProfessor")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(reportId)}
          onOpenChange={(v) => {
            if (!v) {
              setReportId("");
              setReason("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("reportReview")}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                report.mutate();
              }}
            >
              <Label htmlFor="report-reason">{t("reportReason")}</Label>
              <Textarea
                id="report-reason"
                required
                minLength={5}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button type="submit" disabled={report.isPending}>
                {t("reportReview")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
