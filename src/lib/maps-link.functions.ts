import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Resolves a Google Maps short link (maps.app.goo.gl / goo.gl) to its final URL so the
 * client can read the embedded coordinates. Runs server-side because fetching cross-origin
 * from the browser is blocked by CORS. Only Google Maps hosts are allowed — on the first request
 * AND on every redirect hop, so a redirect can't be used to make the server fetch arbitrary
 * (e.g. internal) addresses. Signed-in users only.
 */
const MAX_HOPS = 5;

function isAllowedHost(u: URL): boolean {
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  return (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host === "maps.google.com" ||
    host === "www.google.com" ||
    host.endsWith(".google.com")
  );
}

export const resolveMapsLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((url: string) => {
    if (typeof url !== "string" || url.length > 2000) throw new Error("INVALID_URL");
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("INVALID_URL");
    }
    if (!isAllowedHost(parsed)) throw new Error("INVALID_URL");
    return url;
  })
  .handler(async ({ data: url }) => {
    let current = new URL(url);
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        const next = new URL(location, current);
        if (!isAllowedHost(next)) throw new Error("INVALID_URL");
        current = next;
        continue;
      }
      return { finalUrl: current.toString() };
    }
    throw new Error("INVALID_URL");
  });
