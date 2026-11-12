import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Flag, Check, X, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { universityLabel } from "@/lib/universities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin-reports")({
  head: () => ({ meta: [{ title: "Catalog reports — Ghalib" }] }),
  component: AdminReportsPage,
});

type Status = "open" | "resolved" | "dismissed";
type Filter = Status | "all";

const TEXT = {
  ar: {
    title: "بلاغات الكتالوج",
    subtitle: "النقص والأخطاء في قوائم الجامعات والكليات والتخصصات التي أرسلها الطلاب.",
    notAllowed: "هذه الصفحة للمشرف فقط.",
    notAllowedHint:
      "إذا كنت صاحب الموقع، أضف حسابك إلى جدول app_admins (الخطوات في ملف الـ migration).",
    open: "مفتوحة",
    resolved: "تمت المعالجة",
    dismissed: "مرفوضة",
    all: "الكل",
    missing: "نقص",
    error: "خطأ",
    empty: "لا توجد بلاغات هنا.",
    resolve: "تمت المعالجة",
    dismiss: "رفض",
    reopen: "إعادة فتح",
    updated: "تم التحديث",
    failed: "تعذّر التحديث",
    university: "الجامعة",
    college: "الكلية",
    major: "التخصص",
    loading: "جارٍ التحميل…",
  },
  en: {
    title: "Catalog reports",
    subtitle:
      "Missing items and mistakes in the university / college / major lists, sent by students.",
    notAllowed: "This page is for the site admin only.",
    notAllowedHint:
      "If you own the site, add your account to the app_admins table (steps are in the migration file).",
    open: "Open",
    resolved: "Resolved",
    dismissed: "Dismissed",
    all: "All",
    missing: "Missing",
    error: "Mistake",
    empty: "No reports here.",
    resolve: "Resolve",
    dismiss: "Dismiss",
    reopen: "Reopen",
    updated: "Updated",
    failed: "Couldn't update",
    university: "University",
    college: "College",
    major: "Major",
    loading: "Loading…",
  },
} as const;

function AdminReportsPage() {
  const { user } = useAuth();
  const { lang, dir } = useI18n();
  const c = TEXT[lang];
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("open");

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["is-app-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_app_admin");
      if (error) return false; // function missing (migration not run) → treat as not admin
      return data === true;
    },
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["catalog-reports"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("catalog_reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["catalog-reports"] });
      toast.success(c.updated);
    },
    onError: () => toast.error(c.failed),
  });

  if (checking) {
    return <div className="p-10 text-sm text-muted-foreground">{c.loading}</div>;
  }

  if (!isAdmin) {
    return (
      <div dir={dir} className="mx-auto max-w-xl px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 size-10 text-muted-foreground" />
        <p className="font-semibold">{c.notAllowed}</p>
        <p className="mt-2 text-sm text-muted-foreground">{c.notAllowedHint}</p>
      </div>
    );
  }

  const counts = {
    all: reports.length,
    open: reports.filter((r) => r.status === "open").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };
  const shown = filter === "all" ? reports : reports.filter((r) => r.status === filter);
  const filters: Filter[] = ["open", "resolved", "dismissed", "all"];

  return (
    <div dir={dir} className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
          <Flag className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{c.subtitle}</p>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {c[f]} · {counts[f]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{c.loading}</p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {c.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={r.kind === "missing" ? "secondary" : "destructive"}>
                  {r.kind === "missing" ? c.missing : c.error}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString(lang === "ar" ? "ar-KW" : "en-GB")}
                </span>
                {r.status !== "open" ? (
                  <Badge variant="outline">
                    {r.status === "resolved" ? c.resolved : c.dismissed}
                  </Badge>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{r.message}</p>
              {r.university || r.college || r.major ? (
                <dl className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                  {r.university ? (
                    <div>
                      <dt className="inline font-medium">{c.university}: </dt>
                      <dd className="inline">{universityLabel(r.university, lang)}</dd>
                    </div>
                  ) : null}
                  {r.college ? (
                    <div>
                      <dt className="inline font-medium">{c.college}: </dt>
                      <dd className="inline">{r.college}</dd>
                    </div>
                  ) : null}
                  {r.major ? (
                    <div>
                      <dt className="inline font-medium">{c.major}: </dt>
                      <dd className="inline">{r.major}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "open" ? (
                  <>
                    <Button
                      size="sm"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: r.id, status: "resolved" })}
                    >
                      <Check className="me-1 size-4" />
                      {c.resolve}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: r.id, status: "dismissed" })}
                    >
                      <X className="me-1 size-4" />
                      {c.dismiss}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: r.id, status: "open" })}
                  >
                    <RotateCcw className="me-1 size-4" />
                    {c.reopen}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
