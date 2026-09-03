import { supabase } from "@/integrations/supabase/client";

/**
 * Wipes every piece of the signed-in student's data so the account looks
 * exactly like the first sign-in (onboarding will run again).
 * All deletes run under RLS, so only the current user's rows are touched.
 */
export async function resetAccount(userId: string) {
  // Order matters: children before parents (foreign keys).
  const tables = [
    "chat_messages",
    "chat_sessions",
    "grade_weights",
    "course_items",
    "calendar_events",
    "study_streak",
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw error;
  }

  // Retake links reference other courses — clear them before deleting rows.
  const { error: unlinkError } = await supabase
    .from("courses")
    .update({ previous_attempt_id: null, is_retake: false })
    .eq("user_id", userId)
    .not("previous_attempt_id", "is", null);
  if (unlinkError) throw unlinkError;

  const { error: coursesError } = await supabase.from("courses").delete().eq("user_id", userId);
  if (coursesError) throw coursesError;

  const { error: termsError } = await supabase.from("terms").delete().eq("user_id", userId);
  if (termsError) throw termsError;

  // Uploaded syllabi / major sheets live under a per-user folder.
  const { data: files } = await supabase.storage.from("syllabi").list(userId, { limit: 1000 });
  if (files?.length) {
    await supabase.storage.from("syllabi").remove(files.map((f) => `${userId}/${f.name}`));
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      major: null,
      current_term: null,
      term_number: 1,
      total_credits: 0,
      overall_gpa: null,
      semester_gpa: null,
      university: null,
      onboarding_completed: false,
    })
    .eq("id", userId);
  if (profileError) throw profileError;
}
