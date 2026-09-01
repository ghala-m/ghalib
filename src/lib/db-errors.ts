/**
 * Detects the specific Postgres/PostgREST errors that mean "a migration hasn't been applied
 * to this database yet" (missing column/table), as opposed to a generic save failure. Surfacing
 * this distinctly saves a lot of confused debugging — "تعذّر الحفظ" alone gives no signal that
 * the fix is `supabase db push`, not a code bug.
 */
export function isMissingSchemaError(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message ?? "";
  const code = (error as { code?: string } | null)?.code ?? "";
  // 42703 = undefined_column, 42P01 = undefined_table (Postgres error codes)
  return code === "42703" || code === "42P01" || /column .* does not exist|relation .* does not exist|schema cache/i.test(message);
}
