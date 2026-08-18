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

const PROMPTS: Record<string, string> = {
  summarize:
    "Summarise the material into a clear, structured set of bullet points grouped by topic. Bold key terms. End with a 3-line 'what to memorise' list.",
  flashcards:
    "Create 12-20 revision flashcards from the material. Output them as a numbered list where each entry is 'Q: ...' on one line and 'A: ...' on the next.",
  quiz: "Create 10 multiple-choice questions from the material with four options each. After all questions, output an answer key with a one-line justification per answer.",
  explain:
    "Explain the material in plain, simple language as if teaching a first-year student. Use a real-world analogy and a worked example. Keep it under 400 words.",
  studyPlan:
    "Build a day-by-day study plan covering this material. For each day give a focus topic, an estimated time, and a concrete activity (read / practise / self-test). End with a revision checklist.",
};

export const runStudyTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    if (!data.text.trim() && !data.pdfBase64) throw new Error("EMPTY_INPUT");

    const { createLovableAiGatewayProvider, aiError, AI_MODEL } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const system = [
      "You are Ghalib, an AI study assistant for university students.",
      PROMPTS[data.tool],
      data.lang === "ar" ? "Answer in Arabic." : "Answer in English.",
      "Use markdown-free plain text with clear headings and bullets. Never invent facts that are not in the material.",
    ].join("\n");

    const content = data.pdfBase64
      ? [
          { type: "text" as const, text: data.text || "Use the attached document." },
          { type: "file" as const, data: data.pdfBase64, mediaType: "application/pdf" },
        ]
      : data.text;

    try {
      const result = await generateText({
        model: gateway(AI_MODEL),
        messages: [
          { role: "system", content: system },
          { role: "user", content: content as never },
        ],
      });
      return { text: result.text };
    } catch (error) {
      throw aiError(error);
    }
  });
