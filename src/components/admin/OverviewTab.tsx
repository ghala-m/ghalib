import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCatalog } from "@/hooks/useCatalog";
import { useI18n } from "@/lib/i18n";

type Overview = {
  students: number;
  onboarded: number;
  courses: number;
  open_reports: number;
  archives: number;
  ai_calls_24h: number;
  by_university: { university: string; count: number }[];
  ai_by_endpoint_24h: { endpoint: string; count: number }[];
};

const TEXT = {
  ar: {
    hint: "أرقام إجمالية فقط — لا يمكن للمشرف قراءة محتوى دراسة أي طالب.",
    students: "الطلاب",
    onboarded: "أكملوا التسجيل",
    courses: "المواد",
    open_reports: "بلاغات مفتوحة",
    archives: "أرشيفات جامعات",
    ai: "طلبات الذكاء الاصطناعي (24 ساعة)",
    byUniversity: "الطلاب حسب الجامعة",
    byEndpoint: "الذكاء الاصطناعي حسب الأداة (24 ساعة)",
    none: "—",
    loading: "جارٍ التحميل…",
    failed: "تعذّر تحميل اللمحة. تأكد من تشغيل ملف الـ migration الأخير.",
  },
  en: {
    hint: "Totals only — an admin can't read any student's study content.",
    students: "Students",
    onboarded: "Finished onboarding",
    courses: "Courses",
    open_reports: "Open reports",
    archives: "University archives",
    ai: "AI requests (24h)",
    byUniversity: "Students by university",
    byEndpoint: "AI by tool (24h)",
    none: "—",
    loading: "Loading…",
    failed: "Couldn't load the overview. Make sure the latest migration has been run.",
  },
} as const;

export function OverviewTab() {
  const { lang } = useI18n();
  const catalog = useCatalog();
  const c = TEXT[lang];
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      return data as unknown as Overview;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">{c.loading}</p>;
  if (isError || !data) return <p className="text-sm text-destructive">{c.failed}</p>;

  const stats: [string, number][] = [
    [c.students, data.students],
    [c.onboarded, data.onboarded],
    [c.courses, data.courses],
    [c.open_reports, data.open_reports],
    [c.archives, data.archives],
    [c.ai, data.ai_calls_24h],
  ];
  const max = Math.max(1, ...data.by_university.map((x) => x.count));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{c.hint}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="text-2xl font-bold tabular-nums">
              {n.toLocaleString(lang === "ar" ? "ar-KW" : "en-GB")}
            </div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 font-semibold">{c.byUniversity}</h2>
        <ul className="space-y-2">
          {data.by_university.map((x) => (
            <li key={x.university} className="text-sm">
              <div className="mb-1 flex justify-between gap-2">
                <span className="break-words">
                  {x.university === "-" ? c.none : catalog.universityLabel(x.university, lang)}
                </span>
                <span className="tabular-nums text-muted-foreground">{x.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${(x.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">{c.byEndpoint}</h2>
        {data.ai_by_endpoint_24h.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.none}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.ai_by_endpoint_24h.map((x) => (
              <li
                key={x.endpoint}
                className="flex justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5"
              >
                <span dir="ltr">{x.endpoint}</span>
                <span className="tabular-nums">{x.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
