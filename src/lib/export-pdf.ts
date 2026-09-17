/**
 * Uses html2canvas + jsPDF, imported as real npm dependencies and code-split via dynamic
 * `import()` (so pages that never export a PDF don't pay for either library in their bundle).
 *
 * Why not draw the PDF directly with jsPDF: jsPDF's built-in fonts have no Arabic glyphs and no
 * bidi/shaping support, so Arabic text would render broken; capturing the already-shaped DOM as
 * an image sidesteps that entirely.
 *
 * Previously both libraries were loaded from a CDN (`<script>` tags at runtime) instead of being
 * npm dependencies. That meant export silently failed with PDF_LIB_LOAD_FAILED for anyone whose
 * browser/network blocks cdnjs.cloudflare.com and cdn.jsdelivr.net (ad blockers, corporate/school
 * firewalls, some privacy extensions) — which is indistinguishable, from the user's side, from
 * "the export button doesn't work". Bundling them as dependencies removes that failure mode
 * entirely: nothing is fetched from a third-party host at export time.
 */
import type jsPDFType from "jspdf";

type JsPdfDoc = InstanceType<typeof jsPDFType>;

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

/**
 * Every colour this app uses ultimately traces back to one of these CSS custom properties
 * (styles.css) — gradients, box-shadows, and SVG fill/stroke set via `currentColor` or `var()`
 * all inherit from them too. So instead of chasing every element/property that might contain a
 * colour function (the per-element walk above kept missing cases — a gradient here, an oklab
 * readback there), patch the *source*: temporarily override each variable on <html> with its
 * plain-rgb equivalent before capture. Every consumer picks up the fix automatically through
 * normal CSS variable resolution, with nothing left to individually track down.
 */
const THEME_COLOR_VARS = [
  "--accent",
  "--accent-foreground",
  "--background",
  "--border",
  "--card",
  "--card-foreground",
  "--cat-college",
  "--cat-general",
  "--cat-major",
  "--cat-major_elective",
  "--cat-prep",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--destructive",
  "--destructive-foreground",
  "--foreground",
  "--input",
  "--muted",
  "--muted-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--ring",
  "--secondary",
  "--secondary-foreground",
  "--sidebar",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
  "--success",
  "--success-foreground",
  "--warning",
  "--warning-foreground",
] as const;

async function withNormalizedThemeVars<T>(fn: () => Promise<T>): Promise<T> {
  const root = document.documentElement;
  const computed = getComputedStyle(root);
  // Saves exactly what was there before (usually nothing — these are normally only set via the
  // stylesheet's :root/.dark rules, except whichever ones the active accent/combo theme already
  // overrides inline) so it can be restored byte-for-byte afterward, regardless of capture outcome.
  const previousInline = THEME_COLOR_VARS.map(
    (name) => [name, root.style.getPropertyValue(name)] as const,
  );
  for (const name of THEME_COLOR_VARS) {
    const current = computed.getPropertyValue(name).trim();
    if (current) root.style.setProperty(name, normalizeColorFunctions(current));
  }
  try {
    return await fn();
  } finally {
    for (const [name, val] of previousInline) {
      if (val) root.style.setProperty(name, val);
      else root.style.removeProperty(name);
    }
  }
}

let loading: Promise<{
  html2canvas: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  JsPDF: new (opts: Record<string, unknown>) => JsPdfDoc;
}> | null = null;

async function ensureLibs() {
  if (typeof window === "undefined") throw new Error("NO_WINDOW");
  if (!loading) {
    loading = Promise.all([import("html2canvas"), import("jspdf")])
      .then(([html2canvasMod, jsPdfMod]) => ({
        html2canvas: html2canvasMod.default,
        JsPDF: jsPdfMod.jsPDF,
      }))
      .catch((e) => {
        loading = null; // allow retrying on the next click instead of permanently failing
        throw e;
      });
  }
  try {
    return await loading;
  } catch {
    throw new Error("PDF_LIB_LOAD_FAILED");
  }
}

/**
 * Captures `el` exactly as the browser renders it (correct Arabic shaping/RTL included) and
 * saves it as a downloadable single-page PDF sized to the content. Toggles the `.pdf-capturing`
 * class on <html> first so print-only styling (white background, hidden buttons — see
 * styles.css) applies during the capture without needing an actual print dialog.
 *
 * Throws Error("PDF_LIB_LOAD_FAILED") if the lazy-loaded chunk fails for some other reason (e.g.
 * an interrupted page load) — callers should point at Print as a fallback in that case.
 */
/** Which toast copy to show for a failed export — network/CDN issue vs. anything else. */
export function pdfErrorKey(e: unknown): "pdfExportFailed" | "pdfExportFailedGeneric" {
  return e instanceof Error && e.message === "PDF_LIB_LOAD_FAILED"
    ? "pdfExportFailed"
    : "pdfExportFailedGeneric";
}

export async function exportElementToPdf(el: HTMLElement, filename: string): Promise<void> {
  const { html2canvas, JsPDF } = await ensureLibs();
  document.documentElement.classList.add("pdf-capturing");
  try {
    const canvas = await withNormalizedThemeVars(() =>
      html2canvas(el, {
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        backgroundColor: "#ffffff",
        useCORS: true,
      } as Record<string, unknown>),
    );
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
