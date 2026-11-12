import { createFileRoute } from "@tanstack/react-router";
import { Flag, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useCatalog";
import { useI18n } from "@/lib/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportsTab } from "@/components/admin/ReportsTab";
import { CatalogTab } from "@/components/admin/CatalogTab";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { AdminsTab } from "@/components/admin/AdminsTab";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Control panel — Ghalib" }] }),
  component: AdminPage,
});

const TEXT = {
  ar: {
    title: "صفحة التحكم",
    studentSub: "مشرف طلابي — بلاغات الطلاب وتعديل قوائم الجامعات.",
    techSub: "مشرف تقني — كل أدوات التحكم، وحسابك كطالب يعمل كالمعتاد.",
    reports: "البلاغات",
    catalog: "الكتالوج",
    overview: "لمحة",
    admins: "المشرفون",
    notAllowed: "هذه الصفحة للمشرفين فقط.",
    notAllowedHint:
      "إذا كنت صاحب الموقع، أضف حسابك إلى جدول app_admins (الخطوات في ملفات الـ migration).",
    loading: "جارٍ التحميل…",
  },
  en: {
    title: "Control panel",
    studentSub: "Student admin — student reports and the university lists.",
    techSub: "Technical admin — every control, and your student account works as usual.",
    reports: "Reports",
    catalog: "Catalog",
    overview: "Overview",
    admins: "Admins",
    notAllowed: "This page is for admins only.",
    notAllowedHint:
      "If you own the site, add your account to the app_admins table (steps are in the migration files).",
    loading: "Loading…",
  },
} as const;

function AdminPage() {
  const { user } = useAuth();
  const { lang, dir } = useI18n();
  const c = TEXT[lang];
  const { data: role, isLoading } = useAdminRole(user?.id);

  if (isLoading) return <div className="p-10 text-sm text-muted-foreground">{c.loading}</div>;

  if (!role) {
    return (
      <div dir={dir} className="mx-auto max-w-xl px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 size-10 text-muted-foreground" />
        <p className="font-semibold">{c.notAllowed}</p>
        <p className="mt-2 text-sm text-muted-foreground">{c.notAllowedHint}</p>
      </div>
    );
  }

  const tech = role === "tech";
  return (
    <div dir={dir} className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
          <Flag className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{tech ? c.techSub : c.studentSub}</p>
        </div>
      </header>

      <Tabs defaultValue="reports" dir={dir}>
        <TabsList className="mb-4 h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="reports">{c.reports}</TabsTrigger>
          <TabsTrigger value="catalog">{c.catalog}</TabsTrigger>
          {tech ? <TabsTrigger value="overview">{c.overview}</TabsTrigger> : null}
          {tech ? <TabsTrigger value="admins">{c.admins}</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="catalog">
          <CatalogTab />
        </TabsContent>
        {tech ? (
          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>
        ) : null}
        {tech ? (
          <TabsContent value="admins">
            <AdminsTab />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
