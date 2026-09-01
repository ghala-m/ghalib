import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  tool: z.enum(["summarize", "flashcards", "quiz", "explain", "studyPlan"]),
  lang: z.enum(["ar", "en"]).catch("ar"),
  text: z.string().max(60000).default(""),
  pdfBase64: z.string().max(9000000).optional(),
  fileName: z.string().max(200).optional(),
});

const TEXT_PROMPTS: Record<string, string> = {
  summarize:
    "Summarise the material into a clear, structured set of bullet points grouped by topic. Bold key terms. End with a 3-line 'what to memorise' list.",
  explain:
    "Explain the material in plain, simple language as if teaching a first-year student. Use a real-world analogy and a worked example. Keep it under 400 words.",
  studyPlan:
    "Build a day-by-day study plan covering this material. For each day give a focus topic, an estimated time, and a concrete activity (read / practise / self-test). End with a revision checklist.",
};

const FlashcardSchema = z.object({ q: z.string().min(1), a: z.string().min(1) });
const QuizQuestionSchema = z.object({
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

export const runStudyTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit(context.supabase, context.userId, {
      endpoint: "runStudyTool",
      maxCalls: 20,
      windowMinutes: 60,
    });

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    if (!data.text.trim() && !data.pdfBase64) throw new Error("EMPTY_INPUT");

    const { createLovableAiGatewayProvider, extractJson, aiError, AI_MODEL } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);
    const langLine = data.lang === "ar" ? "Answer in Arabic." : "Answer in English.";
    const content = data.pdfBase64
      ? [
          { type: "text" as const, text: data.text || "Use the attached document." },
          { type: "file" as const, data: data.pdfBase64, mediaType: "application/pdf" },
        ]
      : data.text;

    const isStructured = data.tool === "flashcards" || data.tool === "quiz";
    const system = [
      "You are Ghalib, an AI study assistant for university students.",
      isStructured
        ? data.tool === "flashcards"
          ? 'Create 12-20 revision flashcards from the material. Output ONLY a raw JSON array (no markdown fences, no prose before or after) of objects shaped exactly { "q": string, "a": string }.'
          : 'Create exactly 10 multiple-choice questions from the material. Output ONLY a raw JSON array (no markdown fences, no prose before or after) of objects shaped exactly { "prompt": string, "options": string[4], "correctIndex": number (0-3), "explanation": string }.'
        : TEXT_PROMPTS[data.tool],
      langLine,
      isStructured
        ? "Never invent facts that are not in the material. The JSON values themselves (q/a/prompt/options/explanation) should be in the requested answer language."
        : "Use markdown-free plain text with clear headings and bullets. Never invent facts that are not in the material.",
    ].join("\n");

    try {
      const result = await generateText({
        model: gateway(AI_MODEL),
        messages: [
          { role: "system", content: system },
          { role: "user", content: content as never },
        ],
      });

      if (data.tool === "flashcards") {
        const cards = z.array(FlashcardSchema).min(1).parse(extractJson(result.text));
        return { kind: "flashcards" as const, cards };
      }
      if (data.tool === "quiz") {
        const questions = z.array(QuizQuestionSchema).min(1).parse(extractJson(result.text));
        return { kind: "quiz" as const, questions };
      }
      return { kind: "text" as const, text: result.text };
    } catch (error) {
      // A malformed/unparseable structured response is still an AI failure from the user's
      // point of view — map it to the same AI_FAILED the UI already knows how to show.
      if (error instanceof Error && (error.message === "PARSE_FAILED" || error.name === "ZodError")) {
        throw new Error("AI_FAILED");
      }
      throw aiError(error);
    }
  });
