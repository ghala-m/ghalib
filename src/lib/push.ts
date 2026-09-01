import { supabase } from "@/integrations/supabase/client";

/** Converts the VAPID public key (base64url) into the Uint8Array format PushManager expects. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/** Registers the service worker (idempotent — safe to call on every app load). */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "permission_denied" | "missing_vapid_key" | "save_failed" };

/**
 * Asks for notification permission (if needed), subscribes to push, and saves the
 * subscription so the scheduled sender (an edge function) can reach this device.
 */
export async function subscribeToPush(userId: string): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  const vapidKey = import.meta.env['VITE_VAPID_PUBLIC_KEY'] as string | undefined;
  if (!vapidKey) {
    console.warn("VITE_VAPID_PUBLIC_KEY is not set — see EMERGENCE.md Task 2.");
    return { ok: false, reason: "missing_vapid_key" };
  }

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "permission_denied" };

  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, reason: "unsupported" };

  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource }));

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.["p256dh"] || !json.keys?.["auth"]) return { ok: false, reason: "save_failed" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys["p256dh"]!,
      auth: json.keys["auth"]!,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) {
    console.error("push_subscriptions save failed", error);
    return { ok: false, reason: "save_failed" };
  }
  return { ok: true };
}

/** Unsubscribes this device and removes its saved subscription. */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
}
