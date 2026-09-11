/**
 * Loads html2canvas + jsPDF from a CDN at runtime instead of as npm dependencies. Why: this
 * avoids the two hard problems with generating a real PDF client-side for this app —
 * (1) jsPDF's built-in fonts have no Arabic glyphs and no bidi/shaping support, so Arabic text
 * would render broken; capturing the already-shaped DOM as an image sidesteps that entirely.
 * (2) it keeps the bundle free of a PDF-drawing library most pages never touch.
 * Both scripts are widely-used, versioned, and loaded once (cached on `window`).
 */

declare global {
  interface Window {
    html2canvas?: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
    jspdf?: { jsPDF: new (opts: Record<string, unknown>) => JsPdfDoc };
  }
}

type JsPdfDoc = {
  addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
  save: (filename: string) => void;
};

/**
 * html2canvas's color parser doesn't understand modern CSS colour functions like oklch() — and
 * this app's entire design-token system (--accent, --border, --muted-foreground, etc., set in
 * styles.css) is defined in oklch(). Browsers can report computed styles back in oklch() format
 * too, so the very act of reading `getComputedStyle` during capture can hand html2canvas a
 * string it can't parse, breaking the capture on every single page that uses these tokens —
 * which matches "the PDF button fails everywhere" far better than a one-off network hiccup.
 *
 * Fix: the 2D canvas API is required by spec to normalize any colour it's given (including
 * oklch()) to a plain rgb()/rgba() string when read back — no colour-space math or extra
 * library needed. We resolve every element's colour/background/border to that plain form on a
 * *clone* of the captured subtree right before rendering, leaving the live page untouched.
 */
const colorProbe: CanvasRenderingContext2D | null =
  typeof document !== "undefined"
    ? (document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D | null)
    : null;

function toRgbString(value: string): string {
  if (!colorProbe || !value) return value;
  try {
    colorProbe.fillStyle = "#000"; // reset so an unparsable value below falls back predictably
    colorProbe.fillStyle = value;
    return colorProbe.fillStyle;
  } catch {
    return value;
  }
}

const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
] as const;

function inlineResolvedColors(root: HTMLElement) {
  // The clone html2canvas hands to onclone lives in a *different* document (usually a hidden
  // iframe) — calling the outer window's getComputedStyle on an element from another document
  // is invalid cross-realm usage and throws in some browsers, which was silently aborting the
  // whole export. Must use that document's own window instead.
  const view = root.ownerDocument.defaultView ?? window;
  const all: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of all) {
    const cs = view.getComputedStyle(el);
    for (const prop of COLOR_PROPS) {
      const val = cs[prop];
      if (
        val &&
        (val.includes("oklch") ||
          val.includes("lab(") ||
          val.includes("lch(") ||
          val.includes("color("))
      ) {
        el.style.setProperty(
          prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()),
          toRgbString(val),
          "important",
        );
      }
    }
  }
}

function loadScript(sources: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sources.some((src) => document.querySelector(`script[src="${src}"]`))) {
      resolve();
      return;
    }
    let i = 0;
    const tryNext = () => {
      if (i >= sources.length) {
        reject(new Error("PDF_LIB_LOAD_FAILED"));
        return;
      }
      const script = document.createElement("script");
      script.src = sources[i]!;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        i += 1;
        tryNext();
      };
      document.head.appendChild(script);
    };
    tryNext();
  });
}

let loading: Promise<void> | null = null;

async function ensureLibs(): Promise<void> {
  if (typeof window === "undefined") throw new Error("NO_WINDOW");
  if (window.html2canvas && window.jspdf?.jsPDF) return;
  if (!loading) {
    // Two CDNs per library — if the first is blocked or a version 404s, fall back to the second
    // instead of failing outright.
    loading = Promise.all([
      loadScript([
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
      ]),
      loadScript([
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
      ]),
    ]).then(() => undefined);
  }
  try {
    await loading;
  } catch {
    loading = null; // allow retrying on the next click instead of permanently failing
    throw new Error("PDF_LIB_LOAD_FAILED");
  }
  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    loading = null;
    throw new Error("PDF_LIB_LOAD_FAILED");
  }
}

/**
 * Captures `el` exactly as the browser renders it (correct Arabic shaping/RTL included) and
 * saves it as a downloadable single-page PDF sized to the content. Toggles the `.pdf-capturing`
 * class on <html> first so print-only styling (white background, hidden buttons — see
 * styles.css) applies during the capture without needing an actual print dialog.
 *
 * Throws Error("PDF_LIB_LOAD_FAILED") if the CDN scripts can't be fetched (no internet, or the
 * network/browser is blocking cdnjs.cloudflare.com and cdn.jsdelivr.net) — callers should point
 * at Print as a fallback, since that needs no network calls at all.
 */
/** Which toast copy to show for a failed export — network/CDN issue vs. anything else. */
export function pdfErrorKey(e: unknown): "pdfExportFailed" | "pdfExportFailedGeneric" {
  return e instanceof Error && e.message === "PDF_LIB_LOAD_FAILED"
    ? "pdfExportFailed"
    : "pdfExportFailedGeneric";
}

export async function exportElementToPdf(el: HTMLElement, filename: string): Promise<void> {
  await ensureLibs();
  document.documentElement.classList.add("pdf-capturing");
  try {
    const canvas = await window.html2canvas!(el, {
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      backgroundColor: "#ffffff",
      useCORS: true,
      onclone: (clonedDoc: Document) => {
        const clonedRoot = clonedDoc.body;
        if (clonedRoot) {
          try {
            inlineResolvedColors(clonedRoot);
          } catch {
            // Best-effort colour normalization — if it fails for any reason, let html2canvas
            // proceed with the clone as-is rather than aborting the whole export over it.
          }
        }
      },
    } as Record<string, unknown>);
    const JsPDF = window.jspdf!.jsPDF;
    const pdf = new JsPDF({
      unit: "px",
      format: [canvas.width, canvas.height],
      hotfixes: ["px_scaling"],
    });
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
  } finally {
    document.documentElement.classList.remove("pdf-capturing");
  }
}
