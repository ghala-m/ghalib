import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  base64: z.string().min(10),
  mediaType: z.string().min(3),
  courseHint: z.string().optional(),
});

export const ExtractionSchema = z.object({
  course_name: z.string().nullable(),
  course_code: z.string().nullable(),
  instructor: z.string().nullable(),
  location: z.string().nullable(),
  term: z.string().nullable(),
  credits: z.number().nullable(),
  meetings: z.array(
    z.object({
      day: z.string(),
      start_time: z.string().nullable(),
      end_time: z.string().nullable(),
      location: z.string().nullable(),
    }),
  ),
  items: z.array(
    z.object({
      type: z.enum(["assignment", "exam", "quiz", "project", "other"]),
      title: z.string(),
      description: z.string().nullable(),
      due_date: z.string().nullable(),
      due_time: z.string().nullable(),
      weight: z.number().nullable(),
    }),
  ),
  grade_weights: z.array(z.object({ category: z.string(), percentage: z.number() })),
  missing_fields: z.array(z.string()),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

export const parseSyllabus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText, Output } = await import("ai");

    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = [
      "You extract structured academic data from a university course syllabus.",
      "Return ONLY facts present in the document. Use null for anything not stated — never invent dates, weights or names.",
      "Dates must be ISO format YYYY-MM-DD. If a year is not stated, infer it from the term when it is unambiguous, otherwise return null.",
      "Grade weight percentages are numbers without the % sign.",
      "Keep titles in the document's original language.",
      "In missing_fields, list only these keys when they could not be determined: course_name, course_code, instructor, location, term, credits, meetings, items, grade_weights.",
      data.courseHint ? `The student says this syllabus is for: ${data.courseHint}` : "",
    ].join("\n");

    try {
      const result = await generateText({
        model: gateway("google/gemini-3.5-flash"),
        output: Output.object({ schema: ExtractionSchema }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "file", data: bytes, mediaType: data.mediaType },
            ],
          },
        ],
      });
      return await result.output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("429")) throw new Error("RATE_LIMIT");
      if (message.includes("402")) throw new Error("NO_CREDITS");
      throw new Error("PARSE_FAILED");
    }
  });
