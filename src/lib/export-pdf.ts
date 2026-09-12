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
 * html2canvas's colour parser doesn't understand modern CSS colour functions (oklch, oklab,
 * lab, lch, color()) — and this app's entire design-token system (--accent, --border, etc.) is
 * defined in oklch(). The browser can hand back computed styles in *any* of those formats too,
 * so simply reading getComputedStyle during capture can feed html2canvas a string it can't
 * parse — breaking the capture on every page that uses these tokens (which is all of them).
 *
 * First attempt used `ctx.fillStyle` read-back to normalize colours, on the assumption the 2D
 * canvas API always serializes to rgb()/rgba(). That assumption was wrong: some browsers echo
 * wide-gamut colours back as oklab() too, which html2canvas *still* can't parse (this is
 * exactly the "unsupported color function oklab" failure this was hit with). The fix that's
 * actually guaranteed by spec: render the colour to a 1x1 canvas pixel and read the raw RGBA
 * *bytes* back via getImageData — pixel data is always plain 0-255 integers, no colour-function
 * ambiguity possible, regardless of what format the input was in.
 */
const probeCanvas: HTMLCanvasElement | null =
  typeof document !== "undefined" ? document.createElement("canvas") : null;
if (probeCanvas) {
  probeCanvas.width = 1;
  probeCanvas.height = 1;
}
const probeCtx: CanvasRenderingContext2D | null =
  probeCanvas?.getContext("2d", { willReadFrequently: true }) ?? null;

function resolveOneColor(colorFn: string): string {
  if (!probeCtx) return colorFn;
  try {
    probeCtx.clearRect(0, 0, 1, 1);
    probeCtx.fillStyle = "#000"; // reset so a value canvas can't parse falls back predictably, not to a stale colour
    probeCtx.fillStyle = colorFn;
    probeCtx.fillRect(0, 0, 1, 1);
    const data = probeCtx.getImageData(0, 0, 1, 1).data;
    const [r, g, b, a] = [data[0]!, data[1]!, data[2]!, data[3]!];
    return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  } catch {
    return colorFn;
  }
}

// Matches one CSS colour-function call, allowing a single level of nested parens (needed for
// color-mix(in oklch, ...) and similar) — used to find-and-replace every such call *inside* a
// larger value like a gradient, not just when the whole property value is one colour.
const COLOR_FN_RE = /(?:oklch|oklab|lch|lab|color)\((?:[^()]|\([^()]*\))*\)/gi;

function normalizeColorFunctions(value: string): string {
  if (!value || !COLOR_FN_RE.test(value)) return value;
  COLOR_FN_RE.lastIndex = 0;
  return value.replace(COLOR_FN_RE, (match) => resolveOneColor(match));
}

// Beyond the plain colour properties, background-image (gradients) and box-shadow embed colour
// functions *inside* a larger value, and SVG fill/stroke can carry them too when set via CSS
// (this app's charts and icons often are) rather than an inline attribute.
const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "boxShadow",
  "fill",
  "stroke",
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
      if (!val) continue;
      const resolved = normalizeColorFunctions(val);
      if (resolved !== val) {
        el.style.setProperty(
          prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()),
          resolved,
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
