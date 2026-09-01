import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type RateLimitOptions = { endpoint: string; maxCalls: number; windowMinutes: number };

/**
 * Per-user, per-endpoint rate limit for AI-calling server functions, backed by a DB log rather
 * than an in-memory counter — server functions may run as separate serverless invocations with
 * no memory shared between requests, so an in-process counter would silently do nothing.
 *
 * Throws `Error("RATE_LIMIT")` if the user has made `maxCalls` or more requests to this
 * `endpoint` within the trailing `windowMinutes`. On success, records this call.
 *
 * Fails *open* on infrastructure errors (a broken log table shouldn't take down the AI features
 * it's meant to protect) — errors are logged, not thrown, and the request is allowed through.
 */
export async function enforceRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  { endpoint, maxCalls, windowMinutes }: RateLimitOptions,
): Promise<void> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const { count, error } = await supabase
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", since);

  if (error) {
    console.error("[rate-limit] check failed, allowing request through", endpoint, error);
  } else if ((count ?? 0) >= maxCalls) {
    throw new Error("RATE_LIMIT");
  }

  const { error: insertError } = await supabase.from("ai_usage_log").insert({ user_id: userId, endpoint });
  if (insertError) console.error("[rate-limit] failed to log usage", endpoint, insertError);
}
