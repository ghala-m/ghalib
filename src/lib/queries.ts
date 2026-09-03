import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type CourseItem = Database["public"]["Tables"]["course_items"]["Row"];
export type GradeWeight = Database["public"]["Tables"]["grade_weights"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CourseStatus = Database["public"]["Enums"]["course_status"];
export type ItemType = Database["public"]["Enums"]["item_type"];
export type CourseCategory = Database["public"]["Enums"]["course_category"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type ChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"];

export const chatSessionsQuery = () => ({
  queryKey: ["chat-sessions"],
  queryFn: async (): Promise<ChatSession[]> => {
    const { data, error } = await supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const chatMessagesQuery = (sessionId: string | null) => ({
  queryKey: ["chat", sessionId],
  queryFn: async (): Promise<ChatMessage[]> => {
    if (!sessionId) return [];
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  },
});

export type Meeting = { day: string; start_time: string | null; end_time: string | null; location: string | null };

export function meetingsOf(course: Pick<Course, "meetings">): Meeting[] {
  const raw = course.meetings;
  return Array.isArray(raw) ? (raw as unknown as Meeting[]) : [];
}

export const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Parses a free-text meeting day (English or Arabic, as extracted from a syllabus) into a 0(Sun)-6(Sat) index, or -1 if unrecognized. */
export function meetingDayIndex(day: string): number {
  const v = day.trim().toLowerCase();
  const en = DAY_KEYS.findIndex((k) => v.startsWith(k.slice(0, 3)));
  if (en >= 0) return en;
  const ar = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return ar.findIndex((k) => v.includes(k.replace("ال", "")));
}

export const coursesQuery = () => ({
  queryKey: ["courses"],
  queryFn: async (): Promise<Course[]> => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const courseQuery = (id: string) => ({
  queryKey: ["course", id],
  queryFn: async () => {
    const [course, items, weights] = await Promise.all([
      supabase.from("courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("course_items").select("*").eq("course_id", id).order("due_date", { ascending: true }),
      supabase.from("grade_weights").select("*").eq("course_id", id).order("percentage", { ascending: false }),
    ]);
    if (course.error) throw course.error;
    return {
      course: course.data as Course | null,
      items: (items.data ?? []) as CourseItem[],
      weights: (weights.data ?? []) as GradeWeight[],
    };
  },
});

export const profileQuery = (userId: string | undefined) => ({
  queryKey: ["profile", userId],
  enabled: !!userId,
  queryFn: async (): Promise<Profile | null> => {
    if (!userId) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    if (data) return data;
    const inserted = await supabase.from("profiles").insert({ id: userId }).select("*").maybeSingle();
    return inserted.data ?? null;
  },
});

export const upcomingItemsQuery = () => ({
  queryKey: ["upcoming"],
  queryFn: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("course_items")
      .select("*, courses(name, code, archived)")
      .gte("due_date", today)
      .eq("completed", false)
      .order("due_date", { ascending: true })
      .limit(12);
    if (error) throw error;
    return (data ?? []) as (CourseItem & { courses: { name: string; code: string | null; archived: boolean } | null })[];
  },
});

export const allItemsQuery = () => ({
  queryKey: ["items", "all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("course_items")
      .select("*, courses(name, code, nickname, category, archived)")
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as (CourseItem & {
      courses: {
        name: string;
        code: string | null;
        nickname: string | null;
        category: CourseCategory;
        archived: boolean;
      } | null;
    })[];
  },
});

export type TermRow = Database["public"]["Tables"]["terms"]["Row"];
export type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];

export const termsQuery = () => ({
  queryKey: ["terms"],
  queryFn: async (): Promise<TermRow[]> => {
    const { data, error } = await supabase.from("terms").select("*").order("term_number", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export type StreakEntryRow = Database["public"]["Tables"]["study_streak"]["Row"];

export const streakQuery = () => ({
  queryKey: ["streak"],
  queryFn: async (): Promise<StreakEntryRow[]> => {
    const { data, error } = await supabase.from("study_streak").select("*");
    if (error) throw error;
    return data ?? [];
  },
});

/** Logs (or increments) today's study/attendance streak entry for the current user. */
export async function logStreakToday(userId: string): Promise<void> {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { data: existing } = await supabase
    .from("study_streak")
    .select("id, count")
    .eq("user_id", userId)
    .eq("log_date", todayIso)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("study_streak").update({ count: existing.count + 1 }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("study_streak").insert({ user_id: userId, log_date: todayIso, count: 1 });
    if (error) throw error;
  }
}

export const eventsQuery = (courseId?: string) => ({
  queryKey: ["events", courseId ?? "all"],
  queryFn: async (): Promise<CalendarEvent[]> => {
    let q = supabase.from("calendar_events").select("*").order("event_date", { ascending: true });
    if (courseId) q = q.eq("course_id", courseId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
});

/** Nicknames are stored comma-separated in a single column. */
export function nicknameList(nickname: string | null | undefined): string[] {
  return (nickname ?? "")
    .split(/[,،]/)
    .map((n) => n.trim())
    .filter(Boolean);
}

/** First nickname, used wherever a single short label is shown. */
export function primaryNickname(nickname: string | null | undefined): string | null {
  return nicknameList(nickname)[0] ?? null;
}

/** Course search that also matches the student's own nickname/abbreviation. */
export function matchesCourse(c: Course, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [c.name, c.code, c.term, ...nicknameList(c.nickname)].some((v) => (v ?? "").toLowerCase().includes(q));
}

const normCode = (v: string) => v.replace(/\s+/g, "").toUpperCase();

/** A course is blocked when another course in its alternatives group is already taken. */
export function blockedByAlternative(course: Course, all: Course[]) {
  if (!course.alt_group || course.status === "completed" || course.status === "current") return false;
  return all.some(
    (o) =>
      o.id !== course.id &&
      o.alt_group &&
      normCode(o.alt_group) === normCode(course.alt_group!) &&
      (o.status === "completed" || o.status === "current"),
  );
}
