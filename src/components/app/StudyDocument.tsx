import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, FileDown, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { STUDY_COPY } from "@/lib/study-options";
import { createStudyPdf, downloadStudyPdf, shareStudyPdf } from "@/lib/study-pdf";

export function StudyDocument({ text, title, subtitle }: { text: string; title: string; subtitle?: string }) {
  const { lang, dir } = useI18n(); const c = STUDY_COPY[lang]; const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false); const [blob, setBlob] = useState<Blob | null>(null);
  useEffect(() => setBlob(null), [text, title, subtitle, lang]);
  const filename = `${title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 100) || "Ghalib-study"}.pdf`;
  async function prepare() {
    if (!ref.current) return; setBusy(true);
    try { setBlob(await createStudyPdf(ref.current)); }
    catch { toast.error(c.failed); } finally { setBusy(false); }
  }
  return <section className="min-w-0">
    <div className="mb-4 flex flex-wrap justify-end gap-2" data-export-hide>
      {!blob ? <Button variant="outline" disabled={busy} onClick={() => void prepare()}>{busy ? <Loader2 className="animate-spin" /> : <FileDown />}{busy ? c.preparing : c.pdf}</Button> : <><Button variant="outline" onClick={() => downloadStudyPdf(blob, filename)}><Download />{c.download}</Button><Button onClick={() => void shareStudyPdf(blob, filename).catch(() => toast.error(c.failed))}><Share2 />{c.share}</Button></>}
    </div>
    <div ref={ref} dir={dir} className="study-document space-y-4">
      <header className="border-b-2 border-primary pb-4"><p className="mb-2 text-xs font-bold text-primary">GHALIB / غالب</p><h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>{subtitle && <p className="mt-2 break-words text-sm text-muted-foreground" dir="auto">{subtitle}</p>}</header>
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </div>
  </section>;
}