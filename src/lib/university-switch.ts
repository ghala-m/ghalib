import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/** Days the previous university's data can be restored. */
export const ARCHIVE_DAYS = 30;
/** After the restore window it stays as a read-only archive for this many more days, then is deleted. */
export const ARCHIVE_READONLY_DAYS = 365;

/** Parent tables first — restore inserts in this order, wipe deletes in reverse. */
const TABLES = [
  "terms",
  "courses",
  "grade_weights",
  "course_items",
  "calendar_events",
  "study_streak",
  "chat_sessions",
  "chat_messages",
  "study_materials",
] as const;
type TableName = (typeof TABLES)[number];

const PROFILE_FIELDS = [
  "college",
  "major",
  "current_term",
  "term_number",
  "total_credits",
  "overall_gpa",
  "semester_gpa",
  "onboarding_completed",
] as const;

type Snapshot = {
  version: 1;
  profile: Record<string, unknown>;
  tables: Record<string, Record<string, unknown>[]>;
};

// The table name is dynamic here, which the generated per-table types can't express.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as any) as any;

async function takeSnapshot(userId: string): Promise<{ snapshot: Snapshot; hasData: boolean }> {
  const tables: Snapshot["tables"] = {};
  for (const table of TABLES) {
    const { data, error } = await db(table).select("*").eq("user_id", userId);
    // A table missing on an older deployment shouldn't abort the whole switch.
    tables[table] = error ? [] : (data ?? []);
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS.join(","))
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const hasData = (tables["courses"]?.length ?? 0) > 0 || (tables["terms"]?.length ?? 0) > 0;
  return {
    snapshot: {
      version: 1,
      profile: (profile as unknown as Record<string, unknown>) ?? {},
      tables,
    },
    hasData,
  };
}

async function wipeRows(userId: string) {
  // Retake links point at other courses — clear them before deleting rows.
  await db("courses")
    .update({ previous_attempt_id: null, is_retake: false })
    .eq("user_id", userId)
    .not("previous_attempt_id", "is", null);
  for (const table of [...TABLES].reverse()) {
    const { error } = await db(table).delete().eq("user_id", userId);
    if (error && error.code !== "42P01") throw error;
  }
}

async function archiveCurrent(userId: string, university: string | null | undefined) {
  const name = (university ?? "").trim();
  if (!name) return;
  const { snapshot, hasData } = await takeSnapshot(userId);
  if (!hasData) return;
  const { error } = await supabase.from("university_archives").insert({
    user_id: userId,
    university: name,
    snapshot: snapshot as unknown as Json,
    expires_at: new Date(Date.now() + ARCHIVE_DAYS * 86_400_000).toISOString(),
    delete_at: new Date(
      Date.now() + (ARCHIVE_DAYS + ARCHIVE_READONLY_DAYS) * 86_400_000,
    ).toISOString(),
  });
  if (error) throw error;
}

/**
 * Student moves to another university: the current university's data is snapshotted for
 * ARCHIVE_DAYS days, the live account is cleared, and onboarding runs again for the new one.
 */
export async function switchUniversity(
  userId: string,
  currentUniversity: string | null | undefined,
  newUniversity: string,
) {
  await archiveCurrent(userId, currentUniversity);
  await wipeRows(userId);
  const { error } = await supabase
    .from("profiles")
    .update({
      university: newUniversity.trim(),
      college: null,
      major: null,
      current_term: null,
      term_number: 1,
      total_credits: 0,
      overall_gpa: null,
      semester_gpa: null,
      onboarding_completed: false,
      university_switched_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
}

export type UniversityArchive = {
  id: string;
  university: string;
  created_at: string;
  /** Restore deadline: until then restorable, afterwards a read-only archive. */
  expires_at: string;
  /** Permanent deletion date. */
  delete_at: string;
};

export const isRestorable = (a: Pick<UniversityArchive, "expires_at">) =>
  new Date(a.expires_at).getTime() > Date.now();

export async function listArchives(userId: string): Promise<UniversityArchive[]> {
  await purgeExpiredArchives(userId);
  const { data, error } = await supabase
    .from("university_archives")
    .select("id,university,created_at,expires_at,delete_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Permanently removes archives past their delete date (runs whenever the student opens settings). */
export async function purgeExpiredArchives(userId: string) {
  await supabase
    .from("university_archives")
    .delete()
    .eq("user_id", userId)
    .lt("delete_at", new Date().toISOString());
}

export function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

/**
 * Brings an archived university back. Whatever is live right now is archived first (so
 * restoring is itself reversible), then the snapshot is re-inserted.
 */
export async function restoreArchive(
  userId: string,
  archiveId: string,
  currentUniversity: string | null | undefined,
) {
  const { data: archive, error } = await supabase
    .from("university_archives")
    .select("*")
    .eq("id", archiveId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!archive || new Date(archive.expires_at).getTime() < Date.now()) {
    throw new Error("expired");
  }
  const snap = archive.snapshot as unknown as Snapshot;

  await archiveCurrent(userId, currentUniversity);
  await wipeRows(userId);

  for (const table of TABLES) {
    let rows = snap.tables[table] ?? [];
    if (!rows.length) continue;
    // Insert courses without retake links first, re-link afterwards (self-reference).
    const links: { id: string; previous_attempt_id: string }[] = [];
    if (table === "courses") {
      rows = rows.map((r) => {
        if (r["previous_attempt_id"]) {
          links.push({
            id: r["id"] as string,
            previous_attempt_id: r["previous_attempt_id"] as string,
          });
        }
        return { ...r, previous_attempt_id: null };
      });
    }
    for (let i = 0; i < rows.length; i += 500) {
      const { error: insErr } = await db(table).insert(rows.slice(i, i + 500));
      if (insErr) throw insErr;
    }
    for (const l of links) {
      await db("courses").update({ previous_attempt_id: l.previous_attempt_id }).eq("id", l.id);
    }
  }

  const { error: pErr } = await supabase
    .from("profiles")
    .update({
      ...(snap.profile as object),
      university: archive.university,
      university_switched_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (pErr) throw pErr;

  await supabase.from("university_archives").delete().eq("id", archiveId);
}

export type { TableName };

export type ArchivedCourse = {
  name: string;
  code: string | null;
  term: string | null;
  credits: number | null;
  final_grade: string | null;
  status: string;
};

/** Read-only view of an archive's courses (works for restorable and expired-but-kept archives). */
export async function readArchive(userId: string, archiveId: string) {
  const { data, error } = await supabase
    .from("university_archives")
    .select("university,snapshot,expires_at,delete_at")
    .eq("id", archiveId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("missing");
  const snap = data.snapshot as unknown as Snapshot;
  const courses = (snap.tables["courses"] ?? []) as unknown as ArchivedCourse[];
  return { university: data.university, profile: snap.profile, courses };
}
