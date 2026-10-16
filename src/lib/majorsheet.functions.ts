import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  base64: z.string().min(10).max(9_000_000).optional(),
  mediaType: z.string().min(3).optional(),
  text: z.string().min(20).max(300_000).optional(),
});

export const PlanCourseSchema = z.object({
  code: z.string().nullable().catch(null),
  name: z.string(),
  credits: z.number().nullable().catch(null),
  category: z.enum(["general", "college", "major", "major_elective"]).catch("general"),
  prerequisites: z.array(z.string()).catch([]),
  level: z.number().nullable().catch(null),
  box: z.string().nullable().catch(null),
  box_required: z.number().nullable().catch(null),
});

export const MajorSheetSchema = z.object({
  university: z.string().nullable().catch(null),
  major: z.string().nullable().catch(null),
  total_credits: z.number().nullable().catch(null),
  courses: z.array(PlanCourseSchema).catch([]),
});

export type PlanCourse = z.infer<typeof PlanCourseSchema>;
export type MajorSheet = z.infer<typeof MajorSheetSchema>;

const SHAPE = `{
  "university": string|null,
  "major": string|null,
  "total_credits": number|null,
  "courses": [{
    "code": string|null,
    "name": string,
    "credits": number|null,
    "category": "general"|"college"|"major"|"major_elective",
    "prerequisites": string[],
    "level": number|null,
    "box": string|null,
    "box_required": number|null
  }]
}`;

export const parseMajorSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit(context.supabase, context.userId, {
      endpoint: "parseMajorSheet",
      maxCalls: 5,
      windowMinutes: 60,
    });

    const { getAiModel, extractJson, aiError } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const model = getAiModel();

    const prompt = [
      "You read a university degree plan / major sheet (study plan) and extract EVERY course listed in it.",
      "Read the WHOLE document carefully, section by section, including section headings and any notes such as",
      "'choose one', 'select 2 courses', 'اختر مادة واحدة', 'يختار الطالب ... ساعات', 'اختياري'.",
      `Reply with ONLY a JSON object in this exact shape (no prose, no markdown): ${SHAPE}`,
      "category rules: 'general' = university/general requirements (required OR elective), 'college' = college/faculty requirements,",
      "'major' = required major/department courses, 'major_elective' = elective courses inside the major.",
      "BOX rules (very important): elective / choice sections are NOT mandatory courses. Every course that belongs to a",
      "section where the student only picks some of the listed courses must get 'box' = the exact section title as written",
      "(e.g. 'General Electives', 'مواد اختيارية عامة', 'Major Electives'), and 'box_required' = how many courses the student",
      "must pick from that box (if the section states credit hours instead, divide by the typical course credits, usually 3;",
      "if not stated, use 1). Courses in the same section share the same box string. Mandatory courses get box=null, box_required=null.",
      "prerequisites must be an array of course CODES exactly as written in the sheet (empty array if none).",
      "level = the plan year/semester number the course belongs to, if the sheet groups courses that way, else null.",
      "Keep course names in the original language of the document. Never invent courses that are not in the document.",
    ].join("\n");

    const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    if (data.text) {
      content.push({ type: "text", text: `MAJOR SHEET TEXT:\n${data.text.slice(0, 150_000)}` });
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
        model,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: [{ role: "user", content: content as any }],
      });
      return MajorSheetSchema.parse(extractJson(result.text));
    } catch (error) {
      throw aiError(error);
    }
  });
