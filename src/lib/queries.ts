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

export const chatMessagesQuery = () => ({
  queryKey: ["chat"],
  queryFn: async (): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  },
});

export type Meeting = { day: string; start_time: string | null; end_time: string | null; location: string | null };

export function meetingsOf(course: Pick<Course, "meetings">): Meeting[] {
  const raw = course.meetings;
  return Array.isArray(raw) ? (raw as unknown as Meeting[]) : [];
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

/** Course search that also matches the student's own nickname/abbreviation. */
export function matchesCourse(c: Course, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [c.name, c.code, c.term, c.nickname].some((v) => (v ?? "").toLowerCase().includes(q));
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
