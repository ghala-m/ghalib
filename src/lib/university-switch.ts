import { supabase } from "@/integrations/supabase/client";
import { removeCourseFiles } from "@/lib/storage-cleanup";

/** Days the previous university's data can be restored. */
export const ARCHIVE_DAYS = 30;
/** After the restore window it stays as a read-only archive for this many more days, then is deleted. */
export const ARCHIVE_READONLY_DAYS = 365;

type Snapshot = {
  version: 1;
  profile: Record<string, unknown>;
  tables: Record<string, Record<string, unknown>[]>;
};

/**
 * Student moves to another university: the current university's data is snapshotted for
 * ARCHIVE_DAYS days, the live account is cleared, and onboarding runs again for the new one.
 * All of it happens atomically inside the database.
 */
export async function switchUniversity(newUniversity: string) {
  // One database transaction (see migration 20261112120000): snapshot → wipe → reset profile.
  const { error } = await supabase.rpc("switch_university", {
    p_new_university: newUniversity.trim(),
  });
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

/**
 * Permanently removes archives past their delete date (runs whenever the student opens settings),
 * together with the uploaded files of the courses they contained.
 */
export async function purgeExpiredArchives(userId: string) {
  const now = new Date().toISOString();
  const { data: expired } = await supabase
    .from("university_archives")
    .select("id,snapshot")
    .eq("user_id", userId)
    .lt("delete_at", now);
  if (!expired?.length) return;

  // Delete the files first: if the row delete succeeded and this failed, the files would be orphaned.
  const snaps = expired.map((a) => a.snapshot as unknown as Snapshot | null);
  const ids = snaps.flatMap((s) => (s?.tables?.["courses"] ?? []).map((c) => String(c["id"])));
  // Files of a course that is live again (restored) must stay.
  const { data: live } = await supabase.from("courses").select("id").eq("user_id", userId);
  const liveIds = new Set((live ?? []).map((c) => c.id));
  await removeCourseFiles(
    userId,
    ids.filter((id) => !liveIds.has(id)),
  );

  await supabase.from("university_archives").delete().eq("user_id", userId).lt("delete_at", now);
}

export function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

/**
 * Brings an archived university back. Whatever is live right now is archived first (so
 * restoring is itself reversible). Atomic: done by a database function in one transaction.
 * Throws an error whose message contains "expired" when the restore window has passed.
 */
export async function restoreArchive(archiveId: string) {
  const { error } = await supabase.rpc("restore_university_archive", { p_archive_id: archiveId });
  if (error) throw error;
}

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
