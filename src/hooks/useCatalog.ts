import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  UNIVERSITIES,
  collegesForUniversity,
  findUniversity,
  majorLabel,
  majorsForCollege,
  universityLabel,
  type University,
} from "@/lib/universities";

export const CATALOG_QUERY_KEY = ["catalog"] as const;

/** Loads the University → College → Major catalog from the database, in display order. */
export async function fetchCatalog(): Promise<University[]> {
  const [u, c, m] = await Promise.all([
    supabase.from("catalog_universities").select("*").eq("active", true).order("sort").order("en"),
    supabase.from("catalog_colleges").select("*").order("sort").order("ar"),
    supabase.from("catalog_majors").select("*").order("sort").order("en"),
  ]);
  if (u.error) throw u.error;
  if (c.error) throw c.error;
  if (m.error) throw m.error;

  const majorsByCollege = new Map<string, { en: string; ar: string }[]>();
  for (const x of m.data ?? []) {
    const list = majorsByCollege.get(x.college_id) ?? [];
    list.push({ en: x.en, ar: x.ar });
    majorsByCollege.set(x.college_id, list);
  }
  const collegesByUniversity = new Map<string, University["colleges"]>();
  for (const x of c.data ?? []) {
    const list = collegesByUniversity.get(x.university_id) ?? [];
    list.push({ ar: x.ar, ...(x.en ? { en: x.en } : {}), majors: majorsByCollege.get(x.id) ?? [] });
    collegesByUniversity.set(x.university_id, list);
  }
  return (u.data ?? []).map((x) => ({
    official: x.official,
    ar: x.ar,
    en: x.en,
    type: x.type === "public" ? "public" : "private",
    aliases: x.aliases ?? [],
    verified: x.verified,
    colleges: collegesByUniversity.get(x.id) ?? [],
  }));
}

/**
 * The catalog every picker reads. Falls back to the list bundled in the code when the database
 * has none yet (migration not applied) or can't be reached, so the pickers never come up empty.
 */
export function useCatalog() {
  const q = useQuery({
    queryKey: CATALOG_QUERY_KEY,
    queryFn: fetchCatalog,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const universities = q.data && q.data.length > 0 ? q.data : UNIVERSITIES;

  return useMemo(
    () => ({
      universities,
      isLoading: q.isLoading,
      fromDatabase: !!q.data && q.data.length > 0,
      find: (stored: string | null | undefined) => findUniversity(stored, universities),
      universityLabel: (stored: string | null | undefined, lang: "ar" | "en") =>
        universityLabel(stored, lang, universities),
      collegesFor: (stored: string | null | undefined) =>
        collegesForUniversity(stored, universities),
      majorsFor: (university: string | null | undefined, college: string | null | undefined) =>
        majorsForCollege(university, college, universities),
      majorLabel: (
        university: string | null | undefined,
        college: string | null | undefined,
        stored: string | null | undefined,
        lang: "ar" | "en",
      ) => majorLabel(university, college, stored, lang, universities),
    }),
    [universities, q.isLoading, q.data],
  );
}

/** 'tech' | 'student' | null for the signed-in user (null when not an admin or migration missing). */
export function useAdminRole(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-role", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<"tech" | "student" | null> => {
      const { data, error } = await supabase.rpc("my_admin_role");
      if (error) return null;
      return data === "tech" || data === "student" ? data : null;
    },
  });
}
