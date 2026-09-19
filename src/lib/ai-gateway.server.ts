import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { APICallError, type LanguageModel } from "ai";

export const AI_MODEL = "google/gemini-3.5-flash";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

/**
 * Picks which AI provider to call, in priority order, entirely from Cloud secrets — no code
 * change needed to switch. This exists so the app isn't hard-locked to Lovable's own AI credit
 * balance: set any ONE of these three secrets (Cloud tab → Secrets) and every AI feature
 * (advisor, study tools, syllabus/transcript/major-sheet import, academic-calendar parsing)
 * switches to that provider's own billing instead, on the student's own account.
 *
 * Order matters only in that the first configured one wins if more than one secret is set —
 * pick whichever provider you actually have an account with:
 *   - OPENAI_API_KEY        → OpenAI directly (gpt-4o-mini)
 *   - GOOGLE_GENERATIVE_AI_API_KEY → Google AI Studio directly (gemini-2.0-flash) — has a
 *     genuinely free tier as of when this was written, so this is the cheapest way to fully
 *     detach from Lovable's credit system; get a key at https://aistudio.google.com/apikey
 *   - ANTHROPIC_API_KEY     → Anthropic directly (claude-3-5-haiku)
 * Falls back to the existing Lovable AI Gateway (LOVABLE_API_KEY) if none of the three are set —
 * so this is purely additive, nothing breaks for anyone who doesn't configure one.
 */
export function getAiModel(): LanguageModel {
  // Cast needed below: @ai-sdk/openai, @ai-sdk/google and @ai-sdk/anthropic each ship their own
  // nested copy of @ai-sdk/provider, at a slightly newer version than the one `ai` itself
  // resolves to at the top level (an npm dedup artifact, not a real incompatibility — the actual
  // runtime shape is identical). TypeScript treats the two copies as nominally different types,
  // so a plain return here fails to structurally satisfy `ai`'s own `LanguageModel` type even
  // though the object works correctly when actually passed to `generateText`.
  const openaiKey = process.env["OPENAI_API_KEY"];
  if (openaiKey)
    return createOpenAI({ apiKey: openaiKey })("gpt-4o-mini") as unknown as LanguageModel;

  const googleKey = process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
  if (googleKey)
    return createGoogleGenerativeAI({ apiKey: googleKey })(
      "gemini-2.0-flash",
    ) as unknown as LanguageModel;

  const anthropicKey = process.env["ANTHROPIC_API_KEY"];
  if (anthropicKey)
    return createAnthropic({ apiKey: anthropicKey })(
      "claude-3-5-haiku-latest",
    ) as unknown as LanguageModel;

  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(lovableKey)(AI_MODEL);
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
