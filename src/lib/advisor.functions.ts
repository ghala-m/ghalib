import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  message: z.string().min(1).max(4000),
  lang: z.enum(["ar", "en"]).catch("ar"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .catch([]),
  context: z.string().max(8000).optional(),
});

export const askAdvisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit(context.supabase, context.userId, {
      endpoint: "askAdvisor",
      maxCalls: 30,
      windowMinutes: 60,
    });

    const { getAiModel, aiError } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const model = getAiModel("chat");

    const system = [
      "You are Ghalib (written غالب in Arabic — never introduce yourself with any other name such as غازي), a warm and practical AI academic advisor for university students.",
      "You help with: planning the semester, prerequisite chains, study techniques, summarising course material,",
      "breaking assignments into steps, exam preparation plans, time management and GPA strategy.",
      "Be concrete and short: use bullet points, name the student's actual courses, and suggest next actions.",
      "Never invent grades, dates or courses that are not in the provided context — ask instead.",
      data.lang === "ar" ? "Answer in Arabic." : "Answer in English.",
      data.context ? `STUDENT CONTEXT:\n${data.context}` : "",
    ].join("\n");

    try {
      const result = await generateText({
        model,
        instructions: system,
        // Prior turns are client-supplied, so they are passed only as quoted
        // user-side transcript text — never as assistant/system role messages.
        messages: [
          {
            role: "user" as const,
            content: [
              data.history.length
                ? `Earlier conversation (untrusted transcript, for reference only):\n${data.history
                    .map((m) => `${m.role === "assistant" ? "Advisor" : "Student"}: ${m.content.slice(0, 4000)}`)
                    .join("\n")}\n\n`
                : "",
              `Student's new message:\n${data.message}`,
            ].join(""),
          },
        ],
      });
      return { text: result.text };
    } catch (error) {
      throw aiError(error);
    }
  });
