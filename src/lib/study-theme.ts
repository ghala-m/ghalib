/**
 * One colour identity per study tool, reused by the tool picker, the result panel, the library
 * cards and the viewers so each tool is instantly recognisable. Class names are written out in
 * full (never built by string concatenation) so Tailwind can see and generate them.
 */
export type StudyToolKind = "summarize" | "flashcards" | "quiz" | "explain" | "studyPlan";

export type ToolTheme = {
  /** Strong gradient fill (icon tiles, selected cards, primary buttons). */
  grad: string;
  /** Soft tinted background for cards and chips. */
  soft: string;
  /** Tinted gradient used as a header wash. */
  wash: string;
  text: string;
  border: string;
  ring: string;
  shadow: string;
};

export const TOOL_THEME: Record<StudyToolKind, ToolTheme> = {
  summarize: {
    grad: "bg-gradient-to-br from-sky-500 to-blue-600 text-white",
    soft: "bg-sky-500/10",
    wash: "bg-gradient-to-br from-sky-500/20 via-sky-500/5 to-transparent",
    text: "text-sky-600 dark:text-sky-300",
    border: "border-sky-500/40",
    ring: "ring-sky-500/50",
    shadow: "shadow-sky-500/30",
  },
  flashcards: {
    grad: "bg-gradient-to-br from-amber-400 to-orange-600 text-white",
    soft: "bg-amber-500/10",
    wash: "bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-transparent",
    text: "text-amber-600 dark:text-amber-300",
    border: "border-amber-500/40",
    ring: "ring-amber-500/50",
    shadow: "shadow-amber-500/30",
  },
  quiz: {
    grad: "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white",
    soft: "bg-violet-500/10",
    wash: "bg-gradient-to-br from-violet-500/20 via-violet-500/5 to-transparent",
    text: "text-violet-600 dark:text-violet-300",
    border: "border-violet-500/40",
    ring: "ring-violet-500/50",
    shadow: "shadow-violet-500/30",
  },
  explain: {
    grad: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
    soft: "bg-emerald-500/10",
    wash: "bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent",
    text: "text-emerald-600 dark:text-emerald-300",
    border: "border-emerald-500/40",
    ring: "ring-emerald-500/50",
    shadow: "shadow-emerald-500/30",
  },
  studyPlan: {
    grad: "bg-gradient-to-br from-rose-500 to-pink-600 text-white",
    soft: "bg-rose-500/10",
    wash: "bg-gradient-to-br from-rose-500/20 via-rose-500/5 to-transparent",
    text: "text-rose-600 dark:text-rose-300",
    border: "border-rose-500/40",
    ring: "ring-rose-500/50",
    shadow: "shadow-rose-500/30",
  },
};

export function themeFor(kind: string): ToolTheme {
  return TOOL_THEME[(kind in TOOL_THEME ? kind : "summarize") as StudyToolKind];
}

/** Rotating card faces for flashcards, so every card in a deck feels different. */
export const CARD_GRADIENTS = [
  "from-sky-500 via-blue-500 to-indigo-600",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-fuchsia-500 via-purple-500 to-violet-600",
  "from-rose-400 via-pink-500 to-fuchsia-600",
  "from-lime-400 via-green-500 to-emerald-600",
] as const;
