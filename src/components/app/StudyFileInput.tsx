import type React from "react";
import { useEffect, useRef, useState } from "react";
import { FileCode, FileImage, FileText, Loader2, Presentation, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { ACCEPTED_STUDY_FILES, prepareStudyFile } from "@/lib/study-files";
import { STUDY_COPY } from "@/lib/study-options";
import type { PreparedDoc } from "@/lib/files";

export const MAX_STUDY_FILES = 5;

function iconFor(doc: PreparedDoc) {
  const ext = doc.fileName.toLowerCase().split(".").pop() || "";
  if (doc.kind === "image") return FileImage;
  if (ext === "pptx") return Presentation;
  if (doc.kind === "pdf" || ext === "docx" || ext === "txt" || ext === "md") return FileText;
  return FileCode;
}

function FileChip({ doc, onRemove, disabled, removeLabel }: { doc: PreparedDoc; onRemove: () => void; disabled: boolean; removeLabel: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (doc.kind !== "image") return;
    const bytes = Uint8Array.from(atob(doc.base64), (ch) => ch.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: doc.mediaType }));
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [doc]);
  const Icon = iconFor(doc);
  const ext = doc.fileName.split(".").pop()?.toUpperCase();
  return (
    <li className="group relative flex h-28 w-32 shrink-0 flex-col justify-between overflow-hidden rounded-2xl bg-muted p-3">
      {preview ? (
        <img src={preview} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
      ) : null}
      <div className="relative flex items-start justify-between">
        <span className="flex size-8 items-center justify-center rounded-lg bg-background/80 text-primary">
          <Icon className="size-4" />
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`${removeLabel}: ${doc.fileName}`}
          title={removeLabel}
          className="flex size-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="relative min-w-0">
        <p className="line-clamp-2 break-all text-xs font-medium leading-snug" dir="auto" title={doc.fileName}>
          {doc.fileName}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{ext}</p>
      </div>
    </li>
  );
}

export function StudyFileInput({
  value,
  onChange,
  disabled = false,
  onBusyChange,
  children,
}: {
  children?: React.ReactNode;
  value: PreparedDoc[];
  onChange: (files: PreparedDoc[]) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { lang } = useI18n();
  const c = STUDY_COPY[lang];
  const ref = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  async function select(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const room = MAX_STUDY_FILES - value.length;
    if (files.length > room) {
      toast.error(lang === "ar" ? `الحد الأقصى ${MAX_STUDY_FILES} ملفات` : `Up to ${MAX_STUDY_FILES} files`);
    }
    setReading(true);
    onBusyChange?.(true);
    const added: PreparedDoc[] = [];
    for (const file of files.slice(0, Math.max(0, room))) {
      try {
        added.push(await prepareStudyFile(file));
      } catch (error) {
        const msg = error instanceof Error ? error.message : "";
        toast.error(
          `${file.name}: ${
            msg === "FILE_TOO_LARGE"
              ? c.fileLimit
              : msg === "TEXT_TOO_LARGE"
                ? lang === "ar" ? "النص طويل جدًا" : "text too long"
                : c.unsupported
          }`,
        );
      }
    }
    onChange([...value, ...added]);
    setReading(false);
    onBusyChange?.(false);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-input bg-background p-3 focus-within:ring-1 focus-within:ring-ring">
      <input
        ref={ref}
        type="file"
        multiple
        aria-label={c.upload}
        accept={ACCEPTED_STUDY_FILES}
        className="hidden"
        disabled={disabled || reading}
        onChange={(e) => {
          void select(e.target.files);
          e.target.value = "";
        }}
      />
      {value.length > 0 && (
        <ul className="flex gap-3 overflow-x-auto pb-1" aria-label={c.source}>
          {value.map((doc, i) => (
            <FileChip
              key={`${doc.fileName}-${i}`}
              doc={doc}
              disabled={disabled || reading}
              removeLabel={c.remove}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
      )}
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || reading || value.length >= MAX_STUDY_FILES}
          onClick={() => ref.current?.click()}
        >
          {reading ? <Loader2 className="animate-spin" /> : <Upload />}
          {reading ? c.reading : c.upload}
        </Button>
        <span className="text-xs text-muted-foreground">
          {c.supported} · {value.length}/{MAX_STUDY_FILES}
        </span>
      </div>
    </div>
  );
}
