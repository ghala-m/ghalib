import { createServerFn } from "@tanstack/react-start";

/**
 * Resolves a Google Maps short link (maps.app.goo.gl / goo.gl) to its final URL so the
 * client can read the embedded coordinates. Runs server-side because fetching cross-origin
 * from the browser is blocked by CORS. Only Google Maps hosts are allowed.
 */
export const resolveMapsLink = createServerFn({ method: "POST" })
  .inputValidator((url: string) => {
    if (typeof url !== "string" || url.length > 2000) throw new Error("INVALID_URL");
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("INVALID_URL");
    }
    const host = parsed.hostname.toLowerCase();
    const allowed =
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "maps.google.com" ||
      host === "www.google.com" ||
      host.endsWith(".google.com");
    if (!allowed) throw new Error("INVALID_URL");
    return url;
  })
  .handler(async ({ data: url }) => {
    const res = await fetch(url, { redirect: "follow" });
    return { finalUrl: res.url };
  });
