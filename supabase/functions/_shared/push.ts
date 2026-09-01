// deno-lint-ignore-file no-explicit-any
import webpush from "npm:web-push@3";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/**
 * Sends a push notification to every device the user has subscribed on. Automatically
 * removes subscriptions the browser/OS has permanently invalidated (404/410). Returns
 * true if at least one device received it.
 */
export async function notifyUser(supabase: any, userId: string, payload: PushPayload): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys are not configured — skipping push send.");
    return false;
  }

  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subs?.length) return false;

  let anySent = false;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
      anySent = true;
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("push send failed", userId, err?.statusCode, err?.message);
      }
    }
  }
  return anySent;
}
