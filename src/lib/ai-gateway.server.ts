import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const AI_MODEL = "google/gemini-3.5-flash";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

/** Models often wrap JSON in markdown fences or prose — pull the JSON payload out. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.search(/[[{]/);
  if (start === -1) throw new Error("PARSE_FAILED");
  const opener = raw[start];
  const closer = opener === "[" ? "]" : "}";
  const end = raw.lastIndexOf(closer);
  if (end === -1) throw new Error("PARSE_FAILED");
  return JSON.parse(raw.slice(start, end + 1));
}

export function aiError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429")) return new Error("RATE_LIMIT");
  if (message.includes("402")) return new Error("NO_CREDITS");
  return new Error("PARSE_FAILED");
}
