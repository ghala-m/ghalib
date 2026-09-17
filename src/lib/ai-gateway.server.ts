import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError } from "ai";

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

/**
 * Classifies a failed AI-gateway call into the handful of codes the client checks for
 * (see the `e.message.includes(...)` chains in AdvisorChat.tsx / tools.tsx / etc.).
 *
 * IMPORTANT: the HTTP status code is *never* part of `error.message` for an `APICallError` —
 * the AI SDK sets `message` to either the response's statusText or a provider-supplied message
 * string (see `createJsonErrorResponseHandler` in `@ai-sdk/provider-utils`), and puts the actual
 * numeric status on a separate `statusCode` field. The previous version of this function did
 * `message.includes("402")` etc., which could never match — so every failure (including a real
 * "out of AI credits" 402) silently fell through to the generic AI_FAILED case, and the user saw
 * a generic "couldn't reply, try again" toast instead of the specific "AI credits exhausted" one.
 * Reading `error.statusCode` directly is what actually works.
 */
export function aiError(error: unknown): Error {
  const statusCode = APICallError.isInstance(error) ? error.statusCode : undefined;
  if (statusCode === 429) return new Error("RATE_LIMIT");
  if (statusCode === 402) return new Error("NO_CREDITS");
  if (statusCode === 403) return new Error("AI_BLOCKED");
  // Fall back to substring matching on the message for non-APICallError failures (network
  // errors, timeouts, etc.) in case anything upstream still embeds a code in the text.
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429")) return new Error("RATE_LIMIT");
  if (message.includes("402")) return new Error("NO_CREDITS");
  if (message.includes("403")) return new Error("AI_BLOCKED");
  return new Error("AI_FAILED");
}
