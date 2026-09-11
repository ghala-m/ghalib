import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { coursesQuery, termsQuery } from "@/lib/queries";
import { deriveTermHistory } from "@/lib/gpa";
import { parseTranscript, type TranscriptData } from "@/lib/transcript-import.functions";
import {
  ACCEPTED_DOCS_AND_IMAGES,
  isAcceptedDocOrImage,
  prepareDocumentOrImage,
} from "@/lib/files";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Historical terms bulk-imported during onboarding never get a row in `terms` (only a term
 * actually started+ended through the app does), so their GPA-trend entry is a best-effort
 * guess derived from course grades with a bare term-number label. This lets the student
 * directly set the real name/GPA/credits for any term — filling in the gap, or correcting a
 * guess that came out wrong.
 */
export function GpaHistoryManager() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: terms = [] } = useQuery(termsQuery());
  const { data: courses = [] } = useQuery(coursesQuery());
  const history = deriveTermHistory(courses, terms);
  const parseFn = useServerFn(parseTranscript);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real `terms` rows with no matching coursework at all — usually created by mistake (e.g. via
  // "add a term" without picking which courses belong to it) rather than a genuine term. Shown
  // separately with a delete action instead of mixed into the real history above.
  const labelsWithCourses = new Set(
    courses
      .filter((c) => c.status === "completed" && !c.archived)
      .map((c) => (c.completed_term || c.term || "").trim())
      .filter(Boolean),
  );
  const emptyTerms = terms.filter((tRow) => !tRow.is_active && !labelsWithCourses.has(tRow.name));

  const orphanCourses = courses.filter(
    (c) => c.status === "completed" && !c.archived && !(c.completed_term || c.term || "").trim(),
  );

  const [open, setOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    termNumber: number | null;
    name: string;
    gpa: string;
    credits: string;
  } | null>(null);
  // Which orphan (no-term-label) courses to tag with this term on save — pre-checked when
  // editing the synthetic "unlabeled" row, optional and unchecked otherwise (e.g. adding a
  // brand new term shouldn't silently absorb unrelated orphan courses).
  const [linkOrphans, setLinkOrphans] = useState<Record<string, boolean>>({});

  const openFor = (row?: (typeof history)[number]) => {
    setEditingKey(row?.key ?? null);
    setEditing({
      termNumber: row?.termNumber ?? null,
      name: row?.label ?? "",
      gpa: row?.gpa != null ? String(row.gpa) : "",
      credits: row?.credits != null ? String(row.credits) : "",
    });
    setLinkOrphans(
      Object.fromEntries(orphanCourses.map((c) => [c.id, row?.key === "__unlabeled__"])),
    );
    setOpen(true);
  };

  async function upsertTerm(row: {
    name: string;
    term_number: number | null;
    gpa: number | null;
    credits: number | null;
  }) {
    if (!user) throw new Error("no user");
    const existing = terms.find((tRow) =>
      row.term_number != null ? tRow.term_number === row.term_number : tRow.name === row.name,
    );
    if (existing) {
      const { error } = await supabase
        .from("terms")
        .update({ name: row.name, gpa: row.gpa, credits: row.credits })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const nextNumber =
        row.term_number ?? Math.max(0, ...terms.map((tRow) => tRow.term_number)) + 1;
      const { error } = await supabase.from("terms").insert({
        user_id: user.id,
        name: row.name,
        term_number: nextNumber,
        gpa: row.gpa,
        credits: row.credits,
        is_active: false,
      });
      if (error) throw error;
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!editing || !user) throw new Error("no editing");
      const name = editing.name.trim();
      if (!name) throw new Error("name required");
      await upsertTerm({
        name,
        term_number: editing.termNumber,
        gpa: editing.gpa.trim() === "" ? null : Number(editing.gpa),
        credits: editing.credits.trim() === "" ? null : Number(editing.credits),
      });
      const idsToLink = Object.entries(linkOrphans)
        .filter(([, checked]) => checked)
        .map(([id]) => id);
      if (idsToLink.length) {
        const { error } = await supabase
          .from("courses")
          .update({ completed_term: name })
          .in("id", idsToLink);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      setOpen(false);
      toast.success(t("save"));
    },
    onError: () => toast.error(t("saveFailed")),
  });

  const deleteEmptyTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("terms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms"] });
      toast.success(t("gpaHistoryEmptyTermDeleted"));
    },
    onError: () => toast.error(t("saveFailed")),
  });

  // Import from a transcript photo/PDF/Word file
  const [parsed, setParsed] = useState<TranscriptData | null>(null);
  const [selectedTerms, setSelectedTerms] = useState<Record<number, boolean>>({});
  const [importOpen, setImportOpen] = useState(false);

  const extract = useMutation({
    mutationFn: async (file: File) => {
      if (!isAcceptedDocOrImage(file)) throw new Error("INVALID_FILE");
      const doc = await prepareDocumentOrImage(file);
      const payload =
        doc.kind === "text" ? { text: doc.text } : { base64: doc.base64, mediaType: doc.mediaType };
      return (await parseFn({ data: payload })) as TranscriptData;
    },
    onSuccess: (data) => {
      setParsed(data);
      setSelectedTerms(Object.fromEntries(data.terms.map((_, i) => [i, true])));
      setImportOpen(true);
    },
    onError: (e: Error) => {
      if (e.message.includes("INVALID_FILE")) toast.error(t("invalidFile"));
      else if (e.message.includes("FILE_TOO_LARGE")) toast.error(t("fileTooLarge"));
      else if (e.message.includes("Missing LOVABLE_API_KEY")) toast.error(t("aiKeyMissing"));
      else if (e.message.includes("RATE_LIMIT")) toast.error(t("aiRateLimit"));
      else if (e.message.includes("NO_CREDITS")) toast.error(t("aiCredits"));
      else toast.error(t("aiFailed"));
    },
  });

  const applyImport = useMutation({
    mutationFn: async () => {
      if (!parsed) return;
      for (let i = 0; i < parsed.terms.length; i++) {
        if (!selectedTerms[i]) continue;
        const term = parsed.terms[i]!;
        await upsertTerm({
          name: term.name,
          term_number: term.term_number,
          gpa: term.gpa,
          credits: term.credits,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms"] });
      setImportOpen(false);
      setParsed(null);
      toast.success(t("gpaHistoryImportApplied"));
    },
    onError: () => toast.error(t("saveFailed")),
  });

  return (
    <div>
      {history.length ? (
        <ul className="mb-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {history.map((row) => (
            <li
              key={row.key}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                !row.label && "bg-amber-500/10",
              )}
            >
              <span className="min-w-0 truncate">
                {!row.label
                  ? t("gpaHistoryUnlabeled")
                  : /^\d+$/.test(row.label)
                    ? `${t("termLabel")} ${row.label}`
                    : row.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.gpa != null ? row.gpa.toFixed(2) : "—"} · {row.credits.toFixed(0)}{" "}
                {t("credits")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                aria-label={t("edit")}
                onClick={() => openFor(row)}
              >
                <Pencil className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">{t("gpaHistoryEmpty")}</p>
      )}

      {emptyTerms.length ? (
        <div className="mb-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3">
          <p className="mb-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            {t("gpaHistoryEmptyTermsHint")}
          </p>
          <ul className="space-y-1.5">
            {emptyTerms.map((tRow) => (
              <li key={tRow.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{tRow.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 text-destructive hover:text-destructive"
                  disabled={deleteEmptyTerm.isPending}
                  onClick={() => deleteEmptyTerm.mutate(tRow.id)}
                >
                  {t("delete")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => openFor()}>
              <Plus className="size-4" />
              {t("gpaHistoryAdd")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("gpaHistoryAdd")}</DialogTitle>
              <DialogDescription>{t("gpaHistoryHint")}</DialogDescription>
            </DialogHeader>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("termName")}</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing((s) => s && { ...s, name: e.target.value })}
                    placeholder="Fall 2025"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("termGpa")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={4}
                      value={editing.gpa}
                      onChange={(e) => setEditing((s) => s && { ...s, gpa: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("credits")}</Label>
                    <Input
                      type="number"
                      step="1"
                      min={0}
                      value={editing.credits}
                      onChange={(e) => setEditing((s) => s && { ...s, credits: e.target.value })}
                    />
                  </div>
                </div>
                {orphanCourses.length ? (
                  <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                    <p className="text-xs font-medium">{t("gpaHistoryLinkOrphans")}</p>
                    <ul className="max-h-32 space-y-1.5 overflow-y-auto">
                      {orphanCourses.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={!!linkOrphans[c.id]}
                            onCheckedChange={(v) => setLinkOrphans((s) => ({ ...s, [c.id]: !!v }))}
                          />
                          <span className="truncate">{c.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                disabled={save.isPending || !editing?.name.trim()}
                onClick={() => save.mutate()}
              >
                {t("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_DOCS_AND_IMAGES}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) extract.mutate(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={extract.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {extract.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {extract.isPending ? t("analyzing") : t("gpaHistoryImportFromFile")}
        </Button>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("gpaHistoryImportReview")}</DialogTitle>
            <DialogDescription>{t("gpaHistoryImportReviewHint")}</DialogDescription>
          </DialogHeader>
          {parsed ? (
            parsed.terms.length ? (
              <ul className="divide-y divide-border">
                {parsed.terms.map((term, i) => (
                  <li key={i} className="flex items-center gap-3 py-2 text-sm">
                    <Checkbox
                      checked={!!selectedTerms[i]}
                      onCheckedChange={(v) => setSelectedTerms((s) => ({ ...s, [i]: !!v }))}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{term.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("termGpa")}: {term.gpa?.toFixed(2) ?? "—"} · {t("credits")}:{" "}
                        {term.credits ?? "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                {t("gpaHistoryImportNothingFound")}
              </p>
            )
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={
                applyImport.isPending ||
                !parsed?.terms.length ||
                !Object.values(selectedTerms).some(Boolean)
              }
              onClick={() => applyImport.mutate()}
            >
              {applyImport.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("gpaHistoryImportApply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
