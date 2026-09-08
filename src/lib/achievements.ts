import { BookOpenCheck, Flame, GraduationCap, Rocket, Sparkles, Star, Trophy } from "lucide-react";
import type { Course, Profile, TermRow } from "@/lib/queries";
import type { StreakEntry } from "@/lib/streak";
import { computeStreaks } from "@/lib/streak";

export type AchievementIcon = typeof BookOpenCheck;

export type Achievement = {
  id: string;
  icon: AchievementIcon;
  /** 0..1 progress toward unlocking — always >= 1 once unlocked. */
  progress: (ctx: AchievementContext) => number;
};

export type AchievementContext = {
  courses: Course[];
  terms: TermRow[];
  streak: StreakEntry[];
  profile: Pick<Profile, "overall_gpa" | "total_credits"> | null | undefined;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Every badge is derived purely from data the app already has (courses, terms, streak,
 * profile totals) — nothing here needs a new database column or manual awarding.
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "firstCourse",
    icon: BookOpenCheck,
    progress: ({ courses }) =>
      clamp01(courses.filter((c) => c.status === "completed" && !c.archived).length / 1),
  },
  {
    id: "firstTerm",
    icon: GraduationCap,
    progress: ({ terms }) => clamp01(terms.filter((t) => t.gpa != null).length / 1),
  },
  {
    id: "credits30",
    icon: Star,
    progress: ({ profile }) => clamp01((profile?.total_credits ?? 0) / 30),
  },
  {
    id: "credits60",
    icon: Rocket,
    progress: ({ profile }) => clamp01((profile?.total_credits ?? 0) / 60),
  },
  {
    id: "credits96",
    icon: Trophy,
    progress: ({ profile }) => clamp01((profile?.total_credits ?? 0) / 96),
  },
  {
    id: "highGpa",
    icon: Sparkles,
    progress: ({ profile }) => clamp01((profile?.overall_gpa ?? 0) / 3.5),
  },
  {
    id: "streak7",
    icon: Flame,
    progress: ({ streak }) => {
      const s = computeStreaks(streak);
      return clamp01(Math.max(s.current, s.longest) / 7);
    },
  },
  {
    id: "streak30",
    icon: Flame,
    progress: ({ streak }) => {
      const s = computeStreaks(streak);
      return clamp01(Math.max(s.current, s.longest) / 30);
    },
  },
];

export function unlockedIds(ctx: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((a) => a.progress(ctx) >= 1).map((a) => a.id);
}
