import { useEffect, useState } from "react";
import { getPushSubscription, pushSupported, subscribeToPush, unsubscribeFromPush, type SubscribeResult } from "@/lib/push";

export function usePushNotifications(userId: string | undefined) {
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushSupported()) {
        setChecking(false);
        return;
      }
      const sub = await getPushSubscription();
      if (!cancelled) {
        setSubscribed(!!sub);
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async (): Promise<SubscribeResult> => {
    if (!userId) return { ok: false, reason: "save_failed" };
    setBusy(true);
    try {
      const result = await subscribeToPush(userId);
      setSubscribed(result.ok);
      return result;
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await unsubscribeFromPush(userId);
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  };

  return { supported: pushSupported(), subscribed, checking, busy, enable, disable };
}
