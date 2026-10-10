import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
    const model = getAiModel();

    const pending = data.items.filter((i) => !i.completed);
    const prompt = [
      `Course: ${data.courseName}. Today: ${data.today}.`,
      `Grade weights: ${data.gradeWeights.map((w) => `${w.category} ${w.percentage}%`).join(", ") || "none"}.`,
      "Upcoming/pending items:",
      ...pending.map(
        (i) =>
          `- ${i.due_date ?? "no date"} | ${i.type} | ${i.title}${i.weight ? ` (${i.weight}%)` : ""}`,
      ),
    ].join("\n");

    try {
      const result = await generateText({
        model,
        system: [
          "You are Ghalib, a friendly study coach. Build a short plan for the NEXT 7 DAYS for this one course.",
          "Start with urgent reminders in the style: 'Remember! tomorrow you have a quiz — study chapters 4 and 5'.",
          "Then give a day-by-day list (max 7 lines) of what to study. Use only the items provided; never invent dates or chapters.",
          "If nothing is pending, say so and suggest light review. Max 140 words, plain text, no markdown headings.",
          data.lang === "ar" ? "Answer in Arabic (Gulf-friendly, simple)." : "Answer in English.",
        ].join("\n"),
        prompt,
      });
      return { text: result.text };
    } catch (error) {
      throw aiError(error);
    }
  });
