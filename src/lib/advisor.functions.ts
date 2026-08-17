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
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider, aiError, AI_MODEL } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const system = [
      "You are Ghalib, a warm and practical AI academic advisor for university students.",
      "You help with: planning the semester, prerequisite chains, study techniques, summarising course material,",
      "breaking assignments into steps, exam preparation plans, time management and GPA strategy.",
      "Be concrete and short: use bullet points, name the student's actual courses, and suggest next actions.",
      "Never invent grades, dates or courses that are not in the provided context — ask instead.",
      data.lang === "ar" ? "Answer in Arabic." : "Answer in English.",
      data.context ? `STUDENT CONTEXT:\n${data.context}` : "",
    ].join("\n");

    try {
      const result = await generateText({
        model: gateway(AI_MODEL),
        messages: [
          { role: "system", content: system },
          ...data.history.map((m) => ({ role: m.role, content: m.content }) as const),
          { role: "user" as const, content: data.message },
        ],
      });
      return { text: result.text };
    } catch (error) {
      throw aiError(error);
    }
  });
