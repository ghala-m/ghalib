// deno-lint-ignore-file no-explicit-any
// Scheduled edge function — trigger every ~10 minutes via pg_cron (see supabase/functions/README.md).
//
// Requires two secrets to actually work end to end:
//   GOOGLE_MAPS_API_KEY  — for traffic-aware commute time (Distance Matrix API). Without it,
//                          the briefing still sends, just without a departure-time recommendation.
//   (weather needs no key — uses Open-Meteo, a free public API)
// See EMERGENCE.md at the repo root for exactly what's missing and how to provide it.
import { createClient } from "npm:@supabase/supabase-js@2";
import { notifyUser } from "../_shared/push.ts";
import { hhmmToMinutes, localNow, minutesToHhmm } from "../_shared/time.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function meetingDayIndex(day: string): number {
  const v = (day || "").trim().toLowerCase();
  const en = DAY_KEYS.findIndex((k) => v.startsWith(k.slice(0, 3)));
  if (en >= 0) return en;
  const ar = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return ar.findIndex((k) => v.includes(k.replace("ال", "")));
}

async function commuteEtaMinutes(profile: any): Promise<number | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", `${profile.home_lat},${profile.home_lng}`);
    url.searchParams.set("destinations", `${profile.university_lat},${profile.university_lng}`);
    url.searchParams.set("departure_time", "now");
    url.searchParams.set("mode", profile.commute_mode || "driving");
    url.searchParams.set("key", GOOGLE_MAPS_API_KEY);
    const res = await fetch(url);
    const json = await res.json();
    const el = json?.rows?.[0]?.elements?.[0];
    const seconds = el?.duration_in_traffic?.value ?? el?.duration?.value;
    return typeof seconds === "number" ? Math.ceil(seconds / 60) : null;
  } catch (err) {
    console.error("distance matrix failed", err);
    return null;
  }
}

async function weatherLine(profile: any): Promise<string | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(profile.home_lat));
    url.searchParams.set("longitude", String(profile.home_lng));
    url.searchParams.set("current", "temperature_2m,precipitation");
    url.searchParams.set("timezone", "auto");
    const res = await fetch(url);
    const json = await res.json();
    const c = json?.current;
    if (!c) return null;
    const temp = Math.round(c.temperature_2m);
    return c.precipitation > 0 ? `${temp}° · احتمال مطر ☔` : `${temp}°`;
  } catch (err) {
    console.error("weather fetch failed", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("Authorization") !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("briefing_enabled", true)
    .not("home_lat", "is", null)
    .not("home_lng", "is", null)
    .not("university_lat", "is", null)
    .not("university_lng", "is", null);

  let sent = 0;
  for (const profile of profiles ?? []) {
    if (await sendIfDue(supabase, profile, now)) sent++;
  }

  return new Response(JSON.stringify({ candidates: profiles?.length ?? 0, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function sendIfDue(supabase: any, profile: any, now: Date): Promise<boolean> {
  const tz = profile.timezone || "Asia/Kuwait";
  const nowLocal = localNow(now, tz);

  const { data: already } = await supabase
    .from("briefing_log")
    .select("id")
    .eq("user_id", profile.id)
    .eq("briefing_date", nowLocal.dateIso)
    .maybeSingle();
  if (already) return false;

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, code, meetings")
    .eq("user_id", profile.id)
    .eq("status", "current")
    .eq("archived", false);

  const todaysMeetings: { name: string; start: number }[] = [];
  for (const course of courses ?? []) {
    const meetings = Array.isArray(course.meetings) ? course.meetings : [];
    for (const m of meetings) {
      if (meetingDayIndex(m.day) === nowLocal.dow && m.start_time) {
        todaysMeetings.push({ name: course.name, start: hhmmToMinutes(m.start_time) });
      }
    }
  }
  if (todaysMeetings.length === 0) return false; // no class today — nothing to brief
  todaysMeetings.sort((a, b) => a.start - b.start);
  const firstClassMinutes = todaysMeetings[0].start;

  const leadMinutes = profile.briefing_lead_minutes ?? 60;
  const triggerAt = firstClassMinutes - leadMinutes;
  // Fire once, within a 15-minute window starting at the trigger time (cron cadence ~10 min).
  if (nowLocal.minutes < triggerAt || nowLocal.minutes - triggerAt > 15) return false;

  const [eta, weather, examsToday] = await Promise.all([
    commuteEtaMinutes(profile),
    weatherLine(profile),
    supabase
      .from("course_items")
      .select("title")
      .eq("user_id", profile.id)
      .eq("type", "exam")
      .eq("due_date", nowLocal.dateIso),
  ]);

  const bufferMinutes = profile.briefing_buffer_minutes ?? 10;
  const lines: string[] = [];
  if (eta != null) {
    const departBy = minutesToHhmm(firstClassMinutes - eta - bufferMinutes);
    lines.push(`🚗 اخرج الساعة ${departBy} عشان توصل قبل محاضرتك بـ${bufferMinutes} دقايق`);
  }
  if (weather) lines.push(`🌤️ ${weather}`);
  lines.push(`📚 ${todaysMeetings.length} محاضرة اليوم`);
  const exams = examsToday?.data ?? [];
  if (exams.length) lines.push(`⚠️ عندك اختبار اليوم: ${exams.map((e: any) => e.title).join("، ")}`);

  const sent = await notifyUser(supabase, profile.id, {
    title: "صباح الخير ☀️",
    body: lines.join("\n"),
    url: "/dashboard",
    tag: "morning-briefing",
  });

  // Log the day as handled regardless of push success, so a subscription failure doesn't
  // cause the same (now-stale) briefing to be recomputed and resent every cron tick.
  await supabase.from("briefing_log").insert({ user_id: profile.id, briefing_date: nowLocal.dateIso });
  return sent;
}
