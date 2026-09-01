import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  base64: z.string().min(10).max(9_000_000).optional(),
  mediaType: z.string().min(3).optional(),
  text: z.string().min(20).max(300_000).optional(),
  courseHint: z.string().optional(),
});

export const ExtractionSchema = z.object({
  course_name: z.string().nullable().catch(null),
  course_code: z.string().nullable().catch(null),
  instructor: z.string().nullable().catch(null),
  location: z.string().nullable().catch(null),
  term: z.string().nullable().catch(null),
  credits: z.number().nullable().catch(null),
  meetings: z
    .array(
      z.object({
        day: z.string(),
        start_time: z.string().nullable().catch(null),
        end_time: z.string().nullable().catch(null),
        location: z.string().nullable().catch(null),
      }),
    )
    .catch([]),
  items: z
    .array(
      z.object({
        type: z.enum(["assignment", "exam", "quiz", "project", "other"]).catch("other"),
        title: z.string(),
        description: z.string().nullable().catch(null),
        due_date: z.string().nullable().catch(null),
        due_time: z.string().nullable().catch(null),
        weight: z.number().nullable().catch(null),
      }),
    )
    .catch([]),
  grade_weights: z.array(z.object({ category: z.string(), percentage: z.number() })).catch([]),
  missing_fields: z.array(z.string()).catch([]),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

const SHAPE = `{
  "course_name": string|null,
  "course_code": string|null,
  "instructor": string|null,
  "location": string|null,
  "term": string|null,
  "credits": number|null,
  "meetings": [{ "day": string, "start_time": "HH:MM"|null, "end_time": "HH:MM"|null, "location": string|null }],
  "items": [{ "type": "assignment"|"exam"|"quiz"|"project"|"other", "title": string, "description": string|null, "due_date": "YYYY-MM-DD"|null, "due_time": "HH:MM"|null, "weight": number|null }],
  "grade_weights": [{ "category": string, "percentage": number }],
  "missing_fields": string[]
}`;

export const parseSyllabus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit(context.supabase, context.userId, {
      endpoint: "parseSyllabus",
      maxCalls: 15,
      windowMinutes: 60,
    });

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider, extractJson, aiError, AI_MODEL } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");

    const gateway = createLovableAiGatewayProvider(key);

    const prompt = [
      "You extract structured academic data from a university course syllabus.",
      `Reply with ONLY a JSON object in this exact shape (no prose, no markdown): ${SHAPE}`,
      "Return ONLY facts present in the document. Use null for anything not stated — never invent dates, weights or names.",
      "Dates must be ISO format YYYY-MM-DD. If a year is not stated, infer it from the term when unambiguous, otherwise null.",
      "Grade weight percentages are numbers without the % sign.",
      "Keep titles in the document's original language.",
      "In missing_fields, list only these keys when they could not be determined: course_name, course_code, instructor, location, term, credits, meetings, items, grade_weights.",
      data.courseHint ? `The student says this syllabus is for: ${data.courseHint}` : "",
    ].join("\n");

    const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    if (data.text) {
      content.push({ type: "text", text: `SYLLABUS DOCUMENT TEXT:\n${data.text.slice(0, 120_000)}` });
    } else if (data.base64) {
      content.push({
        type: "file",
        data: Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0)),
        mediaType: data.mediaType || "application/pdf",
      });
    } else {
      throw new Error("PARSE_FAILED");
    }

    try {
      const result = await generateText({
        model: gateway(AI_MODEL),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: [{ role: "user", content: content as any }],
      });
      return ExtractionSchema.parse(extractJson(result.text));
    } catch (error) {
      throw aiError(error);
    }
  });
