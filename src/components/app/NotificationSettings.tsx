import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2, Share, SquarePlus, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { notificationState, requestNotificationPermission } from "@/hooks/useReminders";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { isIosDevice, isStandaloneApp } from "@/lib/push";

const COPY = {
  ar: {
    enable: "تشغيل التنبيهات",
    disable: "إيقاف التنبيهات",
    active: "التنبيهات مفعّلة على هذا الجهاز",
    iosTitle: "على الآيفون والآيباد: ثبّت الموقع أولاً",
    iosBody:
      "آبل تسمح بالتنبيهات فقط للمواقع المثبّتة على الشاشة الرئيسية. اتبع الخطوات ثم افتح غالب من الأيقونة وفعّل التنبيهات:",
    iosSteps: [
      "افتح الموقع في Safari",
      "اضغط زر المشاركة",
      "اختر «إضافة إلى الشاشة الرئيسية»",
      "افتح غالب من الأيقونة الجديدة واضغط «تشغيل التنبيهات»",
    ],
    unsupportedTitle: "هذا المتصفح لا يدعم التنبيهات",
    unsupportedBody:
      "جرّب فتح الموقع من Chrome أو Safari أو Edge (وليس من داخل تطبيق مثل انستغرام أو تيليجرام).",
    needInstall: "ثبّت الموقع على الشاشة الرئيسية أولاً (الخطوات بالأسفل)",
  },
  en: {
    enable: "Turn on notifications",
    disable: "Turn off notifications",
    active: "Notifications are on for this device",
    iosTitle: "On iPhone/iPad: add the site to your Home Screen first",
    iosBody:
      "Apple only allows notifications for sites installed on the Home Screen. Follow these steps, then open Ghalib from the icon and turn notifications on:",
    iosSteps: [
      "Open the site in Safari",
      "Tap the Share button",
      "Choose “Add to Home Screen”",
      "Open Ghalib from the new icon and tap “Turn on notifications”",
    ],
    unsupportedTitle: "This browser doesn't support notifications",
    unsupportedBody:
      "Try opening the site in Chrome, Safari or Edge (not inside another app such as Instagram or Telegram).",
    needInstall: "Add the site to your Home Screen first (steps below)",
  },
} as const;

/**
 * Single place where the student controls every kind of reminder. The main button is ALWAYS
 * visible on every device: where push isn't available (e.g. iPhone Safari outside an installed
 * app) it explains exactly what to do instead of silently disappearing.
 */
export function NotificationSettings({ userId }: { userId: string | undefined }) {
  const { t, lang } = useI18n();
  const c = COPY[lang];
  const push = usePushNotifications(userId);
  const [permission, setPermission] = useState<ReturnType<typeof notificationState>>("default");
  const [env, setEnv] = useState({ ios: false, standalone: false });
  // Read browser capabilities after mount so server and client render the same first paint.
  useEffect(() => {
    setPermission(notificationState());
    setEnv({ ios: isIosDevice(), standalone: isStandaloneApp() });
  }, []);
  const needsInstall = env.ios && !env.standalone && !push.supported;
  const showGuide = needsInstall;

  async function onMainClick() {
    if (push.subscribed) {
      await push.disable();
      return;
    }
    if (!push.supported) {
      if (needsInstall) {
        toast.info(c.needInstall, { duration: 8000 });
        document
          .getElementById("ios-install-guide")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      // No push at all: fall back to simple in-tab notifications when the browser has them.
      if (permission !== "unsupported") {
        const ok = await requestNotificationPermission();
        setPermission(notificationState());
        toast[ok ? "success" : "error"](ok ? t("notificationsOn") : t("notificationsBlocked"));
        return;
      }
      toast.error(c.unsupportedBody, { duration: 8000 });
      return;
    }
    const result = await push.enable();
    setPermission(notificationState());
    if (result.ok) toast.success(t("pushActive"));
    else if (result.reason === "missing_vapid_key") toast.error(t("pushKeyMissing"));
    else if (result.reason === "permission_denied") toast.error(t("pushPermissionDenied"));
    else if (result.reason === "unsupported") toast.error(t("pushUnsupported"));
    else toast.error(t("saveFailed"));
  }

  const on = push.subscribed || (!push.supported && permission === "granted");

  return (
    <div className="panel mt-6 overflow-hidden p-0" id="notifications">
      <div className="flex items-start gap-3 bg-gradient-to-l from-accent/15 via-accent/5 to-transparent p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
          {on ? <BellRing className="size-5" /> : <Bell className="size-5" />}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">{t("notificationsTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("notificationsHint")}</p>
        </div>
      </div>

      <div className="space-y-4 p-6 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            variant={on ? "outline" : "default"}
            disabled={push.busy}
            onClick={() => void onMainClick()}
            className="min-w-52"
          >
            {push.busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : on ? (
              <BellOff className="size-4" />
            ) : (
              <Bell className="size-4" />
            )}
            {on ? c.disable : c.enable}
          </Button>
          {on && <span className="text-sm font-medium text-cat-college">{c.active}</span>}
        </div>

        {showGuide && (
          <div
            id="ios-install-guide"
            className="rounded-2xl border border-accent/40 bg-accent/10 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Smartphone className="size-4 text-accent" />
              {c.iosTitle}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{c.iosBody}</p>
            <ol className="mt-3 space-y-2 text-sm">
              {c.iosSteps.map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1">{step}</span>
                  {i === 1 && <Share className="size-4 text-muted-foreground" />}
                  {i === 2 && <SquarePlus className="size-4 text-muted-foreground" />}
                </li>
              ))}
            </ol>
          </div>
        )}

        {!push.supported && !needsInstall && permission === "unsupported" && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
            <p className="font-semibold">{c.unsupportedTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.unsupportedBody}</p>
          </div>
        )}

        {push.supported && permission !== "unsupported" && permission !== "granted" && (
          <p className="text-xs text-muted-foreground">{t("pushNotifHint")}</p>
        )}
      </div>
    </div>
  );
}
