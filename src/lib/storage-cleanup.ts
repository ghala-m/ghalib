import { supabase } from "@/integrations/supabase/client";

const BUCKET = "syllabi";
const PAGE = 100;

/**
 * Lists every file under `prefix` in the syllabi bucket, descending into sub-folders.
 * Uploads are stored as `<userId>/<courseId>/<timestamp>-<name>`, so a flat `list(userId)`
 * only returns folders and would miss the actual files.
 */
async function listAllFiles(prefix: string, depth = 0): Promise<string[]> {
  if (depth > 4) return [];
  const out: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset });
    if (error || !data?.length) break;
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      // Folders have no id/metadata; files do.
      if (entry.id) out.push(path);
      else out.push(...(await listAllFiles(path, depth + 1)));
    }
    if (data.length < PAGE) break;
  }
  return out;
}

async function removeAll(paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100));
  }
}

/** Deletes all of a student's uploaded syllabi / major sheets. Best effort — never throws. */
export async function removeAllUserFiles(userId: string): Promise<void> {
  try {
    await removeAll(await listAllFiles(userId));
  } catch (e) {
    console.error("[storage-cleanup] removeAllUserFiles failed", e);
  }
}

/** Deletes the uploaded files of specific courses. Best effort — never throws. */
export async function removeCourseFiles(userId: string, courseIds: string[]): Promise<void> {
  try {
    for (const id of courseIds) {
      await removeAll(await listAllFiles(`${userId}/${id}`));
    }
  } catch (e) {
    console.error("[storage-cleanup] removeCourseFiles failed", e);
  }
}
