import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { StudyOptionsSchema, studyInstructions } from "./study-options";

const Input = z.object({
  lang: z.enum(["ar", "en"]).catch("ar"),
  courseName: z.string().max(200),
  today: z.string().max(20),
  items: z
    .array(
      z.object({
        title: z.string().max(200),
        type: z.string().max(40),
        due_date: z.string().max(20).nullable(),
        completed: z.boolean(),
        weight: z.number().nullable(),
      }),
    )
    .max(80),
  gradeWeights: z.array(z.object({ category: z.string().max(80), percentage: z.number() })).max(30),
  options: StudyOptionsSchema.optional(),
  text: z.string().max(60000).default(""),
  pdfBase64: z.string().max(9000000).optional(),
  imageBase64: z.string().max(9000000).optional(),
  imageMediaType: z.enum(["image/png", "image/jpeg", "image/webp"]).optional(),
});

export const generateWeeklyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit(context.supabase, context.userId, {
      endpoint: "generateWeeklyPlan",
      maxCalls: 20,
      windowMinutes: 60,
    });
    const { getAiModel, aiError } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const model = getAiModel("chat");

    const pending = data.items.filter((i) => !i.completed);
    const prompt = [
      `Course: ${data.courseName}. Today: ${data.today}.`,
      `Grade weights: ${data.gradeWeights.map((w) => `${w.category} ${w.percentage}%`).join(", ") || "none"}.`,
      "Upcoming/pending items:",
      ...pending.map(
        (i) =>
          `- ${i.due_date ?? "no date"} | ${i.type} | ${i.title}${i.weight ? ` (${i.weight}%)` : ""}`,
      ),
      data.text ? `Study material:\n${data.text}` : "",
    ].join("\n");

    try {
      const result = await generateText({
        model,
        instructions: [
          "You are Ghalib, a friendly study coach. Build a personalized plan for this one course.",
          "Start with urgent reminders in the style: 'Remember! tomorrow you have a quiz — study chapters 4 and 5'.",
          data.options ? studyInstructions(data.options) : "Give a Markdown day-by-day plan for the next 7 days. Use only provided items; never invent dates or chapters.",
          "If nothing is pending, say so and plan review from the uploaded material or known course topics. Never invent source contents.",
          data.lang === "ar" ? "Answer in Arabic (Gulf-friendly, simple)." : "Answer in English.",
        ].join("\n"),
        messages: [{ role: "user", content: data.pdfBase64 ? [{ type: "text", text: prompt }, { type: "file", data: data.pdfBase64, mediaType: "application/pdf" }] : data.imageBase64 ? [{ type: "text", text: prompt }, { type: "image", image: `data:${data.imageMediaType || "image/png"};base64,${data.imageBase64}` }] : prompt }],
      });
      return { text: result.text };
    } catch (error) {
      throw aiError(error);
    }
  });
