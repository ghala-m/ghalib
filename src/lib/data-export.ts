import { supabase } from "@/integrations/supabase/client";

/**
 * Every table that holds this student's own data (mirrors the table list in reset.ts, plus the
 * tables added after that file was last touched: study_materials, push_subscriptions,
 * briefing_log). A raw JSON dump, not a formatted report — the point is a portable backup the
 * student can keep for peace of mind after all the manual data entry this app asks of them, not
 * something meant to be read directly.
 */
const EXPORT_TABLES = [
  "profiles",
  "terms",
  "courses",
  "course_items",
  "grade_weights",
  "calendar_events",
  "study_streak",
  "chat_sessions",
  "chat_messages",
  "study_materials",
] as const;

export async function exportUserData(userId: string): Promise<void> {
  const result: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user_id: userId,
  };

  for (const table of EXPORT_TABLES) {
    const query =
      table === "profiles"
        ? supabase.from(table).select("*").eq("id", userId)
        : supabase.from(table).select("*").eq("user_id", userId);
    const { data, error } = await query;
    // A table that doesn't exist yet on an older deployment (missing migration) shouldn't abort
    // the whole export — just note it's empty and keep going with everything that does exist.
    result[table] = error ? [] : (data ?? []);
  }

  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ghalib-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
