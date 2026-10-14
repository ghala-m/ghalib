import { MAX_UPLOAD_BYTES, prepareDocument, type PreparedDoc } from "./files";

const TEXT_EXTS = new Set("txt md markdown csv json xml yaml yml toml ini log html htm css scss sass less js jsx ts tsx mjs cjs java py pyw ipynb c cpp cc h hpp cs go rs rb php swift kt kts scala sql sh bash zsh r dart vue svelte tex asm pl lua dockerfile makefile gradle properties bat ps1".split(" "));
const IMAGE_EXTS = new Set("jpg jpeg png webp gif bmp svg avif ico tif tiff heic heif".split(" "));
export const ACCEPTED_STUDY_FILES = `.pdf,.docx,.pptx,image/*,${[...TEXT_EXTS, ...IMAGE_EXTS].map(x => `.${x}`).join(",")}`;
export function studyFileKind(name: string, mime = "") {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "word";
  if (ext === "pptx") return "slides";
  if (IMAGE_EXTS.has(ext) || mime.startsWith("image/")) return "image";
  if (TEXT_EXTS.has(ext) || mime.startsWith("text/")) return "text";
  return null;
}

export function htmlStudyText(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,noscript,template").forEach(el => el.remove());
  doc.querySelectorAll("p,div,section,article,h1,h2,h3,h4,li,tr,br,pre").forEach(el => el.append("\n"));
  return (doc.body.textContent || "").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function imageDocument(file: File): Promise<PreparedDoc> {
  const ext = file.name.toLowerCase().split(".").pop();
  let blob: Blob = file;
  if (ext === "heic" || ext === "heif") {
    const { default: convert } = await import("heic2any");
    const result = await convert({ blob: file, toType: "image/jpeg" });
    blob = Array.isArray(result) ? result[0] : result;
  }
  const canvas = document.createElement("canvas");
  if (ext === "tif" || ext === "tiff") {
    const { default: UTIF } = await import("utif");
    const buffer = await file.arrayBuffer();
    const pages = UTIF.decode(buffer);
    const page = pages[0];
    if (!page) throw new Error("EMPTY_DOCUMENT");
    UTIF.decodeImage(buffer, page);
    if (page.width * page.height > 40_000_000) throw new Error("FILE_TOO_LARGE");
    canvas.width = page.width; canvas.height = page.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("READ_FAILED");
    context.putImageData(new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(page)), page.width, page.height), 0, 0);
  } else {
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image(); image.src = url;
      await image.decode();
      const ratio = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("READ_FAILED");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    } finally { URL.revokeObjectURL(url); }
  }
  return { kind: "image", mediaType: "image/png", base64: canvas.toDataURL("image/png").split(",")[1] || "", fileName: file.name };
}

export async function prepareStudyFile(file: File): Promise<PreparedDoc> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("FILE_TOO_LARGE");
  if (!file.size) throw new Error("EMPTY_DOCUMENT");
  const kind = studyFileKind(file.name, file.type);
  if (!kind) throw new Error("INVALID_FILE");
  if (kind === "pdf" || kind === "word") return prepareDocument(file);
  if (kind === "image") return imageDocument(file);
  let text = "";
  if (kind === "slides") {
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(file);
    const slides = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));
    if (slides.length > 500) throw new Error("FILE_TOO_LARGE");
    const result: string[] = [];
    let total = 0;
    for (const name of slides) {
      const entry = zip.file(name);
      if (!entry) continue;
      const xml = await entry.async("string");
      total += xml.length;
      if (total > 10_000_000) throw new Error("FILE_TOO_LARGE");
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      const lines = Array.from(doc.getElementsByTagNameNS("*", "t")).map(el => el.textContent).filter(Boolean);
      result.push(`Slide ${result.length + 1}\n${lines.join("\n")}`);
    }
    text = result.join("\n\n");
    if (!result.some(slide => slide.split("\n").slice(1).join("").trim())) throw new Error("EMPTY_DOCUMENT");
  } else {
    text = await file.text();
    if (text.includes("\0") || text.includes("\ufffd")) throw new Error("INVALID_FILE");
    if (/\.html?$/i.test(file.name)) text = htmlStudyText(text);
  }
  if (!text.trim()) throw new Error("EMPTY_DOCUMENT");
  if (text.length > 60000) throw new Error("TEXT_TOO_LARGE");
  return { kind: "text", text, fileName: file.name };
}