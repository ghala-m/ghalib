import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Archive, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/hooks/useCatalog";
import { useI18n } from "@/lib/i18n";
import { daysLeft, isRestorable, listArchives } from "@/lib/university-switch";

/** Show the reminder once the restore window is this close to ending. */
const WARN_WITHIN_DAYS = 7;

const TEXT = {
  ar: {
    one: "بيانات {uni} القديمة تُحفظ للاسترجاع {days} فقط، وبعدها تصبح أرشيفاً للعرض فقط.",
    day: "يوم واحد",
    days: "{n} أيام",
    today: "اليوم الأخير",
    action: "استرجاع أو عرض",
    dismiss: "إخفاء",
  },
  en: {
    one: "Your old {uni} data can be restored for {days} more only; after that it becomes a read-only archive.",
    day: "1 day",
    days: "{n} days",
    today: "the last day",
    action: "Restore or view",
    dismiss: "Dismiss",
  },
} as const;

/**
 * Reminder on the dashboard when a previous university's data is about to leave the 30-day
 * restore window. Uses the same query as the settings page, so it costs no extra request there.
 */
export function ArchiveExpiryBanner() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const catalog = useCatalog();
  const c = TEXT[lang];
  const [hidden, setHidden] = useState(false);

  const { data: archives = [] } = useQuery({
    queryKey: ["university-archives", user?.id],
    enabled: !!user,
    queryFn: () => listArchives(user!.id),
  });

  const soonest = archives
    .filter((a) => isRestorable(a) && daysLeft(a.expires_at) <= WARN_WITHIN_DAYS)
    .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())[0];

  if (!soonest || hidden) return null;

  const n = daysLeft(soonest.expires_at);
  const when = n <= 1 ? (n === 0 ? c.today : c.day) : c.days.replace("{n}", String(n));

  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4"
    >
      <Archive className="mt-0.5 size-5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1 text-sm">
        <p>
          {c.one
            .replace("{uni}", catalog.universityLabel(soonest.university, lang))
            .replace("{days}", when)}
        </p>
        <Link to="/profile" className="mt-1 inline-block font-medium underline underline-offset-2">
          {c.action}
        </Link>
      </div>
      <button
        type="button"
        aria-label={c.dismiss}
        onClick={() => setHidden(true)}
        className="rounded p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
