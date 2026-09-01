// deno-lint-ignore-file no-explicit-any
// Scheduled edge function — trigger every ~5-10 minutes via pg_cron (see supabase/functions/README.md).
// Not a webhook: only a request carrying the shared CRON_SECRET is accepted.
import { createClient } from "npm:@supabase/supabase-js@2";
import { notifyUser } from "../_shared/push.ts";
import { hhmmToMinutes, localNow } from "../_shared/time.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

// How late a reminder is allowed to fire after it was technically due — protects against
// briefly missing the window if a cron run is delayed, without spamming very stale reminders.
const GRACE_MINUTES = 20;

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("Authorization") !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();
  const results = { eventsSent: 0, itemsSent: 0 };

  const [{ data: events }, { data: items }, { data: profiles }] = await Promise.all([
    supabase.from("calendar_events").select("*").is("notified_at", null).not("remind_minutes", "is", null),
    supabase.from("course_items").select("*").is("notified_at", null).eq("completed", false).not("due_date", "is", null),
    supabase.from("profiles").select("id, timezone"),
  ]);

  const tzByUser = new Map<string, string>((profiles ?? []).map((p: any) => [p.id, p.timezone || "Asia/Kuwait"]));

  for (const event of events ?? []) {
    const tz = tzByUser.get(event.user_id) ?? "Asia/Kuwait";
    const nowLocal = localNow(now, tz);
    if (event.event_date !== nowLocal.dateIso && event.event_date > nowLocal.dateIso) continue; // not today or later, skip for now
    const eventMinutes = hhmmToMinutes(event.event_time || "08:00");
    const fireAtMinutes = eventMinutes - (event.remind_minutes ?? 0);
    const isToday = event.event_date === nowLocal.dateIso;
    const overdueMinutes = isToday ? nowLocal.minutes - fireAtMinutes : 24 * 60; // a past date's leftover event: treat as overdue
    if (overdueMinutes < 0 || overdueMinutes > GRACE_MINUTES) continue;

    const sent = await notifyUser(supabase, event.user_id, {
      title: event.title,
      body: [event.event_time, event.notes].filter(Boolean).join(" · ") || "تذكير من غالِب",
      url: "/calendar",
      tag: `event-${event.id}`,
    });
    await supabase.from("calendar_events").update({ notified_at: now.toISOString() }).eq("id", event.id);
    if (sent) results.eventsSent++;
  }

  for (const item of items ?? []) {
    const tz = tzByUser.get(item.user_id) ?? "Asia/Kuwait";
    const nowLocal = localNow(now, tz);
    const dueMinutes = hhmmToMinutes(item.due_time || "09:00");
    // Fixed 24h-before reminder (checklist items don't carry their own remind_minutes yet).
    const fireDateIso = new Date(new Date(`${item.due_date}T00:00:00`).getTime() - 24 * 3600_000).toISOString().slice(0, 10);
    if (fireDateIso !== nowLocal.dateIso) continue;
    const overdueMinutes = nowLocal.minutes - dueMinutes;
    if (overdueMinutes < 0 || overdueMinutes > GRACE_MINUTES) continue;

    const sent = await notifyUser(supabase, item.user_id, {
      title: item.title,
      body: item.due_time ? `مستحقة غداً الساعة ${item.due_time}` : "مستحقة غداً",
      url: "/calendar",
      tag: `item-${item.id}`,
    });
    await supabase.from("course_items").update({ notified_at: now.toISOString() }).eq("id", item.id);
    if (sent) results.itemsSent++;
  }

  return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
});
