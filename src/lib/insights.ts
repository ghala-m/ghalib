import type { Course, CourseItem, Profile, TermRow } from "@/lib/queries";
import type { StreakEntry } from "@/lib/streak";
import { computeStreaks } from "@/lib/streak";
import { buildPrereqGraph, pointsFor, simulateUnlocks } from "@/lib/plan";
import { deriveTermHistory } from "@/lib/gpa";

export type Insight = {
  id: string;
  tone: "tip" | "warning" | "good";
  title: string;
  body: string;
  /** A ready-made question the student can send to the advisor chat about this insight. */
  prompt: string;
};

export type InsightContext = {
  courses: Course[];
  items: (CourseItem & { courses: { name: string; archived: boolean } | null })[];
  streak: StreakEntry[];
  terms: TermRow[];
  profile: Pick<Profile, "overall_gpa" | "total_credits"> | null | undefined;
  lang: "ar" | "en";
};

const tr = (lang: "ar" | "en", ar: string, en: string) => (lang === "ar" ? ar : en);

/**
 * Computes a short, prioritized list of things worth the student's attention right now — the
 * same data the advisor chat already has access to, surfaced *without* having to think of the
 * right question to ask. Deliberately rule-based (not an AI call): instant, free, and doesn't
 * depend on the AI gateway being configured.
 */
export function computeInsights(ctx: InsightContext): Insight[] {
  const { courses, items, streak, terms, profile, lang } = ctx;
  const active = courses.filter((c) => !c.archived);
  const out: Insight[] = [];

  // 1) Busy week ahead — 3+ ungraded items due within the next 7 days.
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = items.filter(
    (i) =>
      !i.completed &&
      i.due_date &&
      new Date(i.due_date) >= now &&
      new Date(i.due_date) <= weekAhead,
  );
  if (upcoming.length >= 3) {
    out.push({
      id: "busy-week",
      tone: "warning",
      title: tr(lang, "أسبوعك الجاي مزدحم", "Your week ahead is packed"),
      body: tr(
        lang,
        `عندك ${upcoming.length} مهام/اختبارات خلال ٧ أيام. خطط وقتك من الحين.`,
        `You have ${upcoming.length} items due within 7 days. Worth planning your time now.`,
      ),
      prompt: tr(
        lang,
        "ساعدني أرتب أولوياتي لأسبوعي الجاي بناءً على مواعيدي القريبة.",
        "Help me prioritize my upcoming week based on what's due soon.",
      ),
    });
  }

  // 2) A completed course graded C- or below, not yet retaken.
  const cMinus = pointsFor("C-") ?? 1.67;
  const alreadyRetaken = new Set(
    active.map((c) => c.previous_attempt_id).filter((id): id is string => !!id),
  );
  const retakeCandidate = active.find((c) => {
    const p = pointsFor(c.final_grade);
    return c.status === "completed" && p !== null && p <= cMinus && !alreadyRetaken.has(c.id);
  });
  if (retakeCandidate) {
    out.push({
      id: "retake",
      tone: "tip",
      title: tr(lang, "فرصة لتحسين معدلك", "A chance to raise your GPA"),
      body: tr(
        lang,
        `مادة "${retakeCandidate.name}" (${retakeCandidate.final_grade}) تقدر تعيدها.`,
        `"${retakeCandidate.name}" (${retakeCandidate.final_grade}) is eligible for a retake.`,
      ),
      prompt: tr(
        lang,
        `لو أعدت مادة ${retakeCandidate.name} وأخذت A، وش تأثيره على معدلي التراكمي؟`,
        `If I retook ${retakeCandidate.name} and got an A, how would that affect my cumulative GPA?`,
      ),
    });
  }

  // 3) Close to a GPA milestone (Dean's list-style 3.5 threshold).
  const gpa = profile?.overall_gpa ?? null;
  if (gpa != null && gpa >= 3.3 && gpa < 3.5) {
    out.push({
      id: "honors-close",
      tone: "good",
      title: tr(lang, "قريب من التفوق", "Close to honors"),
      body: tr(
        lang,
        `معدلك ${gpa.toFixed(2)} — قريب من ٣.٥. شوف وش يحتاج معدل هالفصل يوصله.`,
        `Your GPA is ${gpa.toFixed(2)} — close to 3.5. See what this term's average needs to be to get there.`,
      ),
      prompt: tr(
        lang,
        "شنو المعدل اللي أحتاجه هالفصل عشان يوصل تراكمي لـ٣.٥؟",
        "What average do I need this term to push my cumulative GPA to 3.5?",
      ),
    });
  }

  // 4) Approaching the Capstone-1 unit gate (96 credits).
  const credits = profile?.total_credits ?? 0;
  if (credits >= 80 && credits < 96) {
    out.push({
      id: "capstone-close",
      tone: "tip",
      title: tr(lang, "كابستون ١ قريب", "Capstone 1 is close"),
      body: tr(
        lang,
        `عندك ${credits} وحدة — باقي ${96 - credits} وحدة عشان تفتح كابستون ١.`,
        `You're at ${credits} credits — ${96 - credits} more unlocks Capstone 1.`,
      ),
      prompt: tr(
        lang,
        "وش أفضل ترتيب لموادي عشان أوصل ٩٦ وحدة بأسرع وقت؟",
        "What's the best course order to reach 96 credits as fast as possible?",
      ),
    });
  }

  // 5) A single future course that would unlock an unusually large number of others.
  const { nodes } = buildPrereqGraph(active);
  const availableIds = nodes.filter((n) => n.state === "available").map((n) => n.course.id);
  let bestUnlock: { course: Course; gain: number } | null = null;
  for (const id of availableIds) {
    const course = active.find((c) => c.id === id);
    if (!course) continue;
    const gain = simulateUnlocks(active, [id]).length;
    if (gain >= 2 && (!bestUnlock || gain > bestUnlock.gain)) bestUnlock = { course, gain };
  }
  if (bestUnlock) {
    out.push({
      id: "high-impact",
      tone: "tip",
      title: tr(lang, "مادة تفتح لك الكثير", "A high-impact course to register"),
      body: tr(
        lang,
        `تسجيل "${bestUnlock.course.name}" يفتح لك ${bestUnlock.gain} مواد ثانية.`,
        `Registering "${bestUnlock.course.name}" unlocks ${bestUnlock.gain} other courses.`,
      ),
      prompt: tr(
        lang,
        `ليش مادة ${bestUnlock.course.name} مهمة أسجلها بأقرب وقت؟`,
        `Why is registering ${bestUnlock.course.name} soon worth prioritizing?`,
      ),
    });
  }

  // 6) Streak lapsed but they've built one before — a gentle nudge, not guilt-tripping.
  const streaks = computeStreaks(streak);
  if (streaks.current === 0 && streaks.longest >= 3) {
    out.push({
      id: "streak-lapsed",
      tone: "tip",
      title: tr(lang, "سترييكك وقف", "Your streak paused"),
      body: tr(
        lang,
        `أطول سترييك لك كان ${streaks.longest} يوم. تسجيل نشاط اليوم يبدأ وحدة جديدة.`,
        `Your longest streak was ${streaks.longest} days. Logging today's study time starts a new one.`,
      ),
      prompt: tr(
        lang,
        "اعطني خطة مذاكرة بسيطة أرجع فيها لسترييك يومي.",
        "Give me a simple study plan to get back into a daily streak.",
      ),
    });
  }

  // 7) GPA trending down over the last two recorded terms.
  const history = deriveTermHistory(active, terms).filter((h) => h.gpa != null);
  if (history.length >= 2) {
    const last = history[history.length - 1]!;
    const prev = history[history.length - 2]!;
    if (last.gpa! < prev.gpa! - 0.3) {
      out.push({
        id: "gpa-dip",
        tone: "warning",
        title: tr(lang, "معدل هالفصل نازل", "This term dipped"),
        body: tr(
          lang,
          `معدلك نزل من ${prev.gpa!.toFixed(2)} إلى ${last.gpa!.toFixed(2)}. تبي نشوف وين السبب؟`,
          `Your GPA dropped from ${prev.gpa!.toFixed(2)} to ${last.gpa!.toFixed(2)}. Want to dig into why?`,
        ),
        prompt: tr(
          lang,
          "معدلي نزل هالفصل — ساعدني أفهم وش المواد اللي أثرت عليه أكثر.",
          "My GPA dropped this term — help me understand which courses affected it most.",
        ),
      });
    }
  }

  const priority: Record<string, number> = {
    "busy-week": 0,
    "gpa-dip": 1,
    retake: 2,
    "high-impact": 3,
    "capstone-close": 4,
    "honors-close": 5,
    "streak-lapsed": 6,
  };
  return out.sort((a, b) => (priority[a.id] ?? 9) - (priority[b.id] ?? 9)).slice(0, 4);
}
