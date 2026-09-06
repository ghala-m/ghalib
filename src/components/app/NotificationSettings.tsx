import { useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { notificationState, requestNotificationPermission } from "@/hooks/useReminders";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * Single place where the student controls every kind of reminder: the in-browser
 * permission (used while the tab is open) and the real push subscription (used when it isn't).
 */
export function NotificationSettings({ userId }: { userId: string | undefined }) {
  const { t } = useI18n();
  const push = usePushNotifications(userId);
  const [permission, setPermission] = useState(() => notificationState());

  return (
    <div className="panel mt-6 p-6" id="notifications">
      <h2 className="font-semibold">{t("notificationsTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("notificationsHint")}</p>

      <div className="mt-4 space-y-3">
        {permission !== "unsupported" && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={permission === "granted" ? "outline" : "default"}
              onClick={async () => {
                if (permission === "denied") {
                  toast.error(t("notificationsBlocked"));
                  return;
                }
                const ok = await requestNotificationPermission();
                setPermission(notificationState());
                toast[ok ? "success" : "error"](ok ? t("notificationsOn") : t("notificationsBlocked"));
              }}
            >
              {permission === "granted" ? <Bell className="size-4" /> : <BellOff className="size-4" />}
              {t("browserReminders")}
            </Button>
            {permission === "granted" && <span className="text-xs text-cat-general">{t("notificationsOn")}</span>}
          </div>
        )}

        {!push.supported ? (
          <p className="text-sm text-muted-foreground">{t("pushUnsupported")}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={push.subscribed ? "outline" : "default"}
              disabled={push.checking || push.busy}
              onClick={async () => {
                if (push.subscribed) {
                  await push.disable();
                  return;
                }
                const result = await push.enable();
                setPermission(notificationState());
                if (result.ok) {
                  toast.success(t("pushActive"));
                } else if (result.reason === "missing_vapid_key") {
                  toast.error(t("pushKeyMissing"));
                } else if (result.reason === "permission_denied") {
                  toast.error(t("pushPermissionDenied"));
                } else if (result.reason === "unsupported") {
                  toast.error(t("pushUnsupported"));
                } else {
                  toast.error(t("saveFailed"));
                }
              }}
            >
              {push.busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : push.subscribed ? (
                <BellOff className="size-4" />
              ) : (
                <Bell className="size-4" />
              )}
              {push.subscribed ? t("pushDisable") : t("pushEnable")}
            </Button>
            {push.subscribed && <span className="text-xs text-cat-general">{t("pushActive")}</span>}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("pushNotifHint")}</p>
      </div>
    </div>
  );
}
