import { useEffect, useRef, useState } from "react";
import { FileText, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { ACCEPTED_STUDY_FILES, prepareStudyFile } from "@/lib/study-files";
import { STUDY_COPY } from "@/lib/study-options";
import type { PreparedDoc } from "@/lib/files";

export function StudyFileInput({ value, onChange, disabled = false, onBusyChange }: { value: PreparedDoc | null; onChange: (file: PreparedDoc | null) => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const { lang } = useI18n(); const c = STUDY_COPY[lang];
  const ref = useRef<HTMLInputElement>(null); const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!value || value.kind !== "image") { setPreview(null); return; }
    const bytes = Uint8Array.from(atob(value.base64), char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: value.mediaType }));
    setPreview(url); return () => URL.revokeObjectURL(url);
  }, [value]);
  async function select(file: File | undefined) {
    if (!file) return;
    setReading(true); onBusyChange?.(true);
    try { onChange(await prepareStudyFile(file)); }
    catch (error) { toast.error(error instanceof Error && error.message === "FILE_TOO_LARGE" ? c.fileLimit : error instanceof Error && error.message === "TEXT_TOO_LARGE" ? (lang === "ar" ? "النص طويل؛ اختر جزءًا لا يتجاوز 60 ألف حرف" : "Text is too long; choose up to 60,000 characters") : c.unsupported); }
    finally { setReading(false); onBusyChange?.(false); }
  }
  return <div className="space-y-3">
    <input ref={ref} type="file" aria-label={c.upload} accept={ACCEPTED_STUDY_FILES} className="hidden" disabled={disabled || reading} onChange={e => { void select(e.target.files?.[0]); e.target.value = ""; }} />
    <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" disabled={disabled || reading} onClick={() => ref.current?.click()}>{reading ? <Loader2 className="animate-spin" /> : <Upload />}{reading ? c.reading : c.upload}</Button><span className="text-xs text-muted-foreground">{c.supported}</span></div>
    {value && <article className="overflow-hidden rounded-lg border border-border bg-muted/30" aria-label={c.source}>
      <div className="flex items-center gap-3 p-3"><FileText className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="break-all text-sm font-semibold" dir="auto">{value.fileName}</p><p className="text-xs text-muted-foreground">{value.kind === "text" ? `${value.text.length.toLocaleString()} ${lang === "ar" ? "حرف" : "characters"}` : value.kind.toUpperCase()}</p></div><Button type="button" variant="ghost" size="icon" disabled={disabled || reading} aria-label={c.remove} title={c.remove} onClick={() => onChange(null)}><X /></Button></div>
      {preview && <img src={preview} alt={value.fileName} className="max-h-52 w-full border-t border-border object-contain" />}
      {value.kind === "text" && <pre className="max-h-40 overflow-auto border-t border-border p-3 text-xs whitespace-pre-wrap break-words" dir="auto">{value.text.slice(0, 1800)}{value.text.length > 1800 ? "…" : ""}</pre>}
    </article>}
  </div>;
}