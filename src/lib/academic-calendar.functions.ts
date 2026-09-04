import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  base64: z.string().min(10).max(9_000_000).optional(),
  mediaType: z.string().min(3).optional(),
  text: z.string().min(10).max(300_000).optional(),
});

export const CalendarEventTypeSchema = z.enum([
  "holiday",
  "break",
  "exam_week",
  "registration",
  "deadline",
  "other",
]);

export const AcademicCalendarSchema = z.object({
  term_name: z.string().nullable().catch(null),
  start_date: z.string().nullable().catch(null), // first day of classes, ISO YYYY-MM-DD
  end_date: z.string().nullable().catch(null), // last day of classes (or finals), ISO YYYY-MM-DD
  weeks_count: z.number().int().positive().nullable().catch(null),
  events: z
    .array(
      z.object({
        title: z.string(),
        type: CalendarEventTypeSchema.catch("other"),
        start_date: z.string(), // ISO
        end_date: z.string().nullable().catch(null),
      }),
    )
    .catch([]),
  missing_fields: z.array(z.string()).catch([]),
});

export type AcademicCalendar = z.infer<typeof AcademicCalendarSchema>;

const SHAPE = `{
  "term_name": string|null,
  "start_date": "YYYY-MM-DD"|null,
  "end_date": "YYYY-MM-DD"|null,
  "weeks_count": number|null,
  "events": [{ "title": string, "type": "holiday"|"break"|"exam_week"|"registration"|"deadline"|"other", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"|null }],
  "missing_fields": string[]
}`;

export const parseAcademicCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit(context.supabase, context.userId, {
      endpoint: "parseAcademicCalendar",
      maxCalls: 15,
      windowMinutes: 60,
    });

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider, extractJson, aiError, AI_MODEL } =
      await import("./ai-gateway.server");
    const { generateText } = await import("ai");

    const gateway = createLovableAiGatewayProvider(key);

    const prompt = [
      "You extract structured data from a university's official academic calendar for one term/semester.",
      `Reply with ONLY a JSON object in this exact shape (no prose, no markdown): ${SHAPE}`,
      "start_date is the first day of classes for the term. end_date is the last day of classes or the last day of final exams if that is clearer.",
      "weeks_count is the number of instructional weeks (do not count holidays as extra weeks; use whatever total the document states, or infer it from start_date/end_date if not stated).",
      "events should list holidays, breaks, add/drop deadlines, withdrawal deadlines, registration periods, and the final exams week — anything with a specific date or date range.",
      "Return ONLY facts present in the document. Use null for anything not stated — never invent dates.",
      "All dates must be ISO format YYYY-MM-DD. If a year is not stated, infer it from context when unambiguous, otherwise null.",
      "Keep event titles in the document's original language.",
      "In missing_fields, list only these keys when they could not be determined: term_name, start_date, end_date, weeks_count, events.",
    ].join("\n");

    const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    if (data.text) {
      content.push({
        type: "text",
        text: `ACADEMIC CALENDAR TEXT:\n${data.text.slice(0, 120_000)}`,
      });
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
      return AcademicCalendarSchema.parse(extractJson(result.text));
    } catch (error) {
      throw aiError(error);
    }
  });
