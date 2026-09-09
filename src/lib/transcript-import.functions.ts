import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  base64: z.string().min(10).max(9_000_000).optional(),
  mediaType: z.string().min(3).optional(),
  text: z.string().min(10).max(300_000).optional(),
});

export const TranscriptTermSchema = z.object({
  name: z.string(),
  term_number: z.number().int().positive().nullable().catch(null),
  gpa: z.number().min(0).max(4).nullable().catch(null),
  credits: z.number().min(0).nullable().catch(null),
});

export const TranscriptSchema = z.object({
  overall_gpa: z.number().min(0).max(4).nullable().catch(null),
  terms: z.array(TranscriptTermSchema).catch([]),
});

export type TranscriptTerm = z.infer<typeof TranscriptTermSchema>;
export type TranscriptData = z.infer<typeof TranscriptSchema>;

const SHAPE = `{
  "overall_gpa": number|null,
  "terms": [{ "name": string, "term_number": number|null, "gpa": number|null, "credits": number|null }]
}`;

export const parseTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit(context.supabase, context.userId, {
      endpoint: "parseTranscript",
      maxCalls: 10,
      windowMinutes: 60,
    });

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider, extractJson, aiError, AI_MODEL } =
      await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = [
      "You read a university official transcript / grade report (كشف الدرجات) — a photo, scan, or PDF export — and extract ONE row per term/semester found in it.",
      `Reply with ONLY a JSON object in this exact shape (no prose, no markdown): ${SHAPE}`,
      "name: the term's label as written (e.g. 'Fall 2025', 'خريف 2025-2026', or just its season+year). Keep the document's original language/script.",
      "term_number: the term's sequential order counting from the student's very first term as 1, if the document shows or implies an ordering (e.g. numbered semesters); otherwise null — never guess.",
      "gpa: that term's own GPA (not cumulative/CGPA), as a 0-4 decimal, matching the scale used in the document. null if not stated for that term.",
      "credits: that term's completed/passed credit hours (not cumulative), as a number. null if not stated.",
      "overall_gpa: the student's final cumulative GPA shown in the document, if present, else null.",
      "List terms in the same chronological order the document shows them. Skip a term entirely if it has no courses/grades yet (e.g. an in-progress term with no grades). Never invent a term that isn't in the document.",
    ].join("\n");

    const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    if (data.text) {
      content.push({ type: "text", text: `TRANSCRIPT TEXT:\n${data.text.slice(0, 120_000)}` });
    } else if (data.base64) {
      const mediaType = data.mediaType || "application/pdf";
      content.push(
        mediaType.startsWith("image/")
          ? {
              type: "image",
              image: Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0)),
              mediaType,
            }
          : {
              type: "file",
              data: Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0)),
              mediaType,
            },
      );
    } else {
      throw new Error("PARSE_FAILED");
    }

    try {
      const result = await generateText({
        model: gateway(AI_MODEL),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: [{ role: "user", content: content as any }],
      });
      return TranscriptSchema.parse(extractJson(result.text));
    } catch (error) {
      throw aiError(error);
    }
  });
