/**
 * The server wraps unclassified AI failures as `AI_FAILED: <provider message>`. Showing that
 * provider message next to the generic toast turns "it doesn't work" into something diagnosable
 * (bad key, wrong model name, quota, region block, unsupported file…).
 */
export function aiFailedDetail(e: Error): string | null {
  const prefix = "AI_FAILED: ";
  const i = e.message.indexOf(prefix);
  return i === -1 ? null : e.message.slice(i + prefix.length) || null;
}

export function withAiDetail(base: string, e: Error): string {
  const d = aiFailedDetail(e);
  return d ? `${base} (${d.slice(0, 160)})` : base;
}
