import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useCatalog } from "@/hooks/useCatalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Status = "open" | "resolved" | "dismissed";
type Filter = Status | "all";

const TEXT = {
  ar: {
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
    hint: "النقص والأخطاء في قوائم الجامعات والكليات والتخصصات التي أرسلها الطلاب. عدّل الكتالوج من تبويب «الكتالوج» ثم علّم البلاغ كمُعالَج.",
  },
  en: {
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
    hint: "Missing items and mistakes in the university / college / major lists, sent by students. Fix the catalog in the Catalog tab, then mark the report resolved.",
  },
} as const;

export function ReportsTab() {
  const { lang } = useI18n();
  const catalog = useCatalog();
  const c = TEXT[lang];
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("open");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["catalog-reports"],
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

  const counts = {
    all: reports.length,
    open: reports.filter((r) => r.status === "open").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };
  const shown = filter === "all" ? reports : reports.filter((r) => r.status === filter);
  const filters: Filter[] = ["open", "resolved", "dismissed", "all"];

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">{c.hint}</p>
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
                      <dd className="inline">{catalog.universityLabel(r.university, lang)}</dd>
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
