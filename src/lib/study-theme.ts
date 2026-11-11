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
    grad: "bg-gradient-to-br from-accent to-accent/70 text-white",
    soft: "bg-accent/10",
    wash: "bg-gradient-to-br from-accent/20 via-accent/5 to-transparent",
    text: "text-foreground",
    border: "border-accent/40",
    ring: "ring-accent/50",
    shadow: "shadow-accent/30",
  },
  flashcards: {
    grad: "bg-gradient-to-br from-accent to-accent/70 text-white",
    soft: "bg-accent/10",
    wash: "bg-gradient-to-br from-accent/20 via-accent/5 to-transparent",
    text: "text-foreground",
    border: "border-accent/40",
    ring: "ring-accent/50",
    shadow: "shadow-accent/30",
  },
  quiz: {
    grad: "bg-gradient-to-br from-accent to-accent/70 text-white",
    soft: "bg-accent/10",
    wash: "bg-gradient-to-br from-accent/20 via-accent/5 to-transparent",
    text: "text-foreground",
    border: "border-accent/40",
    ring: "ring-accent/50",
    shadow: "shadow-accent/30",
  },
  explain: {
    grad: "bg-gradient-to-br from-accent to-accent/70 text-white",
    soft: "bg-accent/10",
    wash: "bg-gradient-to-br from-accent/20 via-accent/5 to-transparent",
    text: "text-foreground",
    border: "border-accent/40",
    ring: "ring-accent/50",
    shadow: "shadow-accent/30",
  },
  studyPlan: {
    grad: "bg-gradient-to-br from-accent to-accent/70 text-white",
    soft: "bg-accent/10",
    wash: "bg-gradient-to-br from-accent/20 via-accent/5 to-transparent",
    text: "text-foreground",
    border: "border-accent/40",
    ring: "ring-accent/50",
    shadow: "shadow-accent/30",
  },
};

export function themeFor(kind: string): ToolTheme {
  return TOOL_THEME[(kind in TOOL_THEME ? kind : "summarize") as StudyToolKind];
}

/** Rotating card faces for flashcards, so every card in a deck feels different. */
export const CARD_GRADIENTS = [
  "from-accent via-accent to-accent/70",
  "from-accent via-accent to-accent/70",
  "from-accent via-accent to-accent/70",
  "from-accent via-accent to-accent/70",
  "from-accent via-accent to-accent/70",
  "from-accent via-accent to-accent/70",
] as const;
