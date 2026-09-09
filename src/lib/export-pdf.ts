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

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PDF_LIB_LOAD_FAILED"));
    document.head.appendChild(script);
  });
}

let loading: Promise<void> | null = null;

async function ensureLibs(): Promise<void> {
  if (typeof window === "undefined") throw new Error("NO_WINDOW");
  if (window.html2canvas && window.jspdf?.jsPDF) return;
  if (!loading) {
    loading = Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js"),
    ]).then(() => undefined);
  }
  await loading;
  if (!window.html2canvas || !window.jspdf?.jsPDF) throw new Error("PDF_LIB_LOAD_FAILED");
}

/**
 * Captures `el` exactly as the browser renders it (correct Arabic shaping/RTL included) and
 * saves it as a downloadable single-page PDF sized to the content. Toggles the `.pdf-capturing`
 * class on <html> first so print-only styling (white background, hidden buttons — see
 * styles.css) applies during the capture without needing an actual print dialog.
 */
export async function exportElementToPdf(el: HTMLElement, filename: string): Promise<void> {
  await ensureLibs();
  document.documentElement.classList.add("pdf-capturing");
  try {
    const canvas = await window.html2canvas!(el, {
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      backgroundColor: "#ffffff",
      useCORS: true,
    });
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
