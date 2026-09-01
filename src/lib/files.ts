export const ACCEPTED_DOCS =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Keep in sync with the server-side `.max()` on `base64` in majorsheet.functions.ts,
// syllabus.functions.ts, and tools.functions.ts. Base64 inflates size by ~4/3, so 9MB of
// base64 caps the original file at roughly 6.5MB — generous for any real syllabus/major sheet,
// while keeping a single AI request bounded in cost and latency.
export const MAX_UPLOAD_BYTES = 6_500_000;

export type PreparedDoc =
  | { kind: "pdf"; base64: string; mediaType: "application/pdf"; fileName: string }
  | { kind: "text"; text: string; fileName: string };

function extOf(name: string) {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

export function isAcceptedDoc(file: File) {
  const ext = extOf(file.name);
  return ext === ".pdf" || ext === ".docx" || ext === ".doc";
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Turns an uploaded PDF/Word file into something the AI can read.
 * PDFs are sent as-is (base64); Word documents are converted to plain text in the browser.
 */
export async function prepareDocument(file: File): Promise<PreparedDoc> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("FILE_TOO_LARGE");
  const ext = extOf(file.name);

  if (ext === ".pdf") {
    return { kind: "pdf", base64: await toBase64(file), mediaType: "application/pdf", fileName: file.name };
  }

  const { default: mammoth } = await import("mammoth/mammoth.browser.js");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = (result?.value ?? "").trim();
  if (!text) throw new Error("EMPTY_DOCUMENT");
  return { kind: "text", text, fileName: file.name };
}
