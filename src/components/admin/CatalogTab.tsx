import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATALOG_QUERY_KEY } from "@/hooks/useCatalog";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEXT = {
  ar: {
    hint: "عدّل الجامعات والكليات والتخصصات التي يراها الطلاب. التعديل يظهر عند الجميع خلال دقائق.",
    universities: "الجامعات",
    colleges: "الكليات",
    majors: "التخصصات",
    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    saved: "تم الحفظ",
    deleted: "تم الحذف",
    failed: "تعذّر تنفيذ العملية",
    duplicate: "هذا الاسم موجود مسبقاً.",
    empty: "لا يوجد شيء هنا بعد.",
    loading: "جارٍ التحميل…",
    official: "الاسم الرسمي (بالإنجليزية — هو المحفوظ عند الطالب)",
    nameAr: "الاسم بالعربية",
    nameEn: "الاسم بالإنجليزية",
    nameEnOptional: "الاسم بالإنجليزية (اختياري)",
    type: "النوع",
    public: "حكومية",
    private: "خاصة",
    verified: "القائمة مكتملة ومؤكدة",
    active: "ظاهرة للطلاب",
    aliases: "أسماء بديلة (مفصولة بفاصلة)",
    confirmDelete: "حذف «{name}»؟",
    deleteUniversity:
      "سيُحذف معها كل كلياتها وتخصصاتها. بيانات الطلاب المحفوظة لا تتأثر، لكن اسم الجامعة سيظهر عندهم كـ «أخرى».",
    deleteCollege: "ستُحذف معها كل تخصصاتها. بيانات الطلاب لا تتأثر.",
    deleteMajor: "بيانات الطلاب لا تتأثر.",
    renameNote:
      "تغيير الاسم لا يغيّر ما حفظه الطلاب سابقاً. عند تغيير الاسم الرسمي للجامعة يُحفظ القديم تلقائياً كاسم بديل.",
    notVerified: "غير مؤكدة",
    hidden: "مخفية",
    back: "رجوع",
  },
  en: {
    hint: "Edit the universities, colleges and majors students pick from. Changes reach everyone within minutes.",
    universities: "Universities",
    colleges: "Colleges",
    majors: "Majors",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    saved: "Saved",
    deleted: "Deleted",
    failed: "Couldn't complete that",
    duplicate: "That name already exists.",
    empty: "Nothing here yet.",
    loading: "Loading…",
    official: "Official name (English — this is what's stored on the student)",
    nameAr: "Arabic name",
    nameEn: "English name",
    nameEnOptional: "English name (optional)",
    type: "Type",
    public: "Public",
    private: "Private",
    verified: "List is complete and verified",
    active: "Visible to students",
    aliases: "Alternative names (comma separated)",
    confirmDelete: "Delete “{name}”?",
    deleteUniversity:
      "All its colleges and majors are deleted too. Students' saved data isn't touched, but their university will show as “Other”.",
    deleteCollege: "All its majors are deleted too. Students' saved data isn't touched.",
    deleteMajor: "Students' saved data isn't touched.",
    renameNote:
      "Renaming doesn't change what students already saved. When you rename a university's official name, the old one is kept automatically as an alternative name.",
    notVerified: "Unverified",
    hidden: "Hidden",
    back: "Back",
  },
} as const;

type Uni = {
  id: string;
  official: string;
  ar: string;
  en: string;
  type: string;
  aliases: string[];
  verified: boolean;
  active: boolean;
  sort: number;
};
type Col = { id: string; university_id: string; ar: string; en: string | null; sort: number };
type Maj = { id: string; college_id: string; en: string; ar: string; sort: number };

type Values = Record<string, string | boolean>;
type Field =
  | { key: string; label: string; kind: "text"; ltr?: boolean; optional?: boolean }
  | { key: string; label: string; kind: "type" }
  | { key: string; label: string; kind: "switch" };

const nextSort = (rows: { sort: number }[]) => rows.reduce((m, r) => Math.max(m, r.sort), 0) + 1;

export function CatalogTab() {
  const { lang, dir } = useI18n();
  const c = TEXT[lang];
  const qc = useQueryClient();
  const [uniId, setUniId] = useState<string | null>(null);
  const [colId, setColId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ kind: "uni" | "col" | "maj"; id: string | null } | null>(
    null,
  );
  const [toDelete, setToDelete] = useState<{
    kind: "uni" | "col" | "maj";
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-catalog"],
    queryFn: async () => {
      const [u, co, m] = await Promise.all([
        supabase.from("catalog_universities").select("*").order("sort").order("en"),
        supabase.from("catalog_colleges").select("*").order("sort").order("ar"),
        supabase.from("catalog_majors").select("*").order("sort").order("en"),
      ]);
      if (u.error) throw u.error;
      if (co.error) throw co.error;
      if (m.error) throw m.error;
      return { unis: u.data as Uni[], cols: co.data as Col[], majs: m.data as Maj[] };
    },
  });
  const unis = data?.unis ?? [];
  const cols = data?.cols ?? [];
  const majs = data?.majs ?? [];

  const uni = unis.find((x) => x.id === uniId) ?? null;
  const col = cols.find((x) => x.id === colId) ?? null;
  const level: "uni" | "col" | "maj" = col ? "maj" : uni ? "col" : "uni";

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-catalog"] }),
      qc.invalidateQueries({ queryKey: CATALOG_QUERY_KEY }),
    ]);
  };
  const onError = (e: unknown) => {
    const code = (e as { code?: string } | null)?.code;
    toast.error(code === "23505" ? c.duplicate : c.failed);
  };

  const save = useMutation({
    mutationFn: async (v: { kind: "uni" | "col" | "maj"; id: string | null; values: Values }) => {
      const s = (k: string) => String(v.values[k] ?? "").trim();
      if (v.kind === "uni") {
        const old = unis.find((x) => x.id === v.id);
        const aliases = s("aliases")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        if (old && old.official !== s("official") && !aliases.includes(old.official)) {
          aliases.push(old.official);
        }
        const row = {
          official: s("official"),
          ar: s("ar"),
          en: s("en"),
          type: v.values["type"] === "public" ? "public" : "private",
          aliases,
          verified: v.values["verified"] === true,
          active: v.values["active"] === true,
        };
        const { error } = v.id
          ? await supabase.from("catalog_universities").update(row).eq("id", v.id)
          : await supabase.from("catalog_universities").insert({ ...row, sort: nextSort(unis) });
        if (error) throw error;
      } else if (v.kind === "col") {
        const row = { ar: s("ar"), en: s("en") || null };
        const { error } = v.id
          ? await supabase.from("catalog_colleges").update(row).eq("id", v.id)
          : await supabase.from("catalog_colleges").insert({
              ...row,
              university_id: uniId!,
              sort: nextSort(cols.filter((x) => x.university_id === uniId)),
            });
        if (error) throw error;
      } else {
        const row = { en: s("en"), ar: s("ar") };
        const { error } = v.id
          ? await supabase.from("catalog_majors").update(row).eq("id", v.id)
          : await supabase.from("catalog_majors").insert({
              ...row,
              college_id: colId!,
              sort: nextSort(majs.filter((x) => x.college_id === colId)),
            });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      setDialog(null);
      await refresh();
      toast.success(c.saved);
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (t: { kind: "uni" | "col" | "maj"; id: string }) => {
      const table =
        t.kind === "uni"
          ? "catalog_universities"
          : t.kind === "col"
            ? "catalog_colleges"
            : "catalog_majors";
      const { error } = await supabase.from(table).delete().eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: async (_d, t) => {
      setToDelete(null);
      if (t.kind === "uni" && t.id === uniId) {
        setUniId(null);
        setColId(null);
      }
      if (t.kind === "col" && t.id === colId) setColId(null);
      await refresh();
      toast.success(c.deleted);
    },
    onError,
  });

  const fields: Field[] = useMemo(() => {
    if (dialog?.kind === "uni")
      return [
        { key: "official", label: c.official, kind: "text", ltr: true },
        { key: "ar", label: c.nameAr, kind: "text" },
        { key: "en", label: c.nameEn, kind: "text", ltr: true },
        { key: "type", label: c.type, kind: "type" },
        { key: "aliases", label: c.aliases, kind: "text", optional: true },
        { key: "verified", label: c.verified, kind: "switch" },
        { key: "active", label: c.active, kind: "switch" },
      ];
    if (dialog?.kind === "col")
      return [
        { key: "ar", label: c.nameAr, kind: "text" },
        { key: "en", label: c.nameEnOptional, kind: "text", ltr: true, optional: true },
      ];
    return [
      { key: "en", label: c.nameEn, kind: "text", ltr: true },
      { key: "ar", label: c.nameAr, kind: "text" },
    ];
  }, [dialog?.kind, c]);

  const initial: Values = useMemo(() => {
    if (!dialog) return {};
    if (dialog.kind === "uni") {
      const u = unis.find((x) => x.id === dialog.id);
      return {
        official: u?.official ?? "",
        ar: u?.ar ?? "",
        en: u?.en ?? "",
        type: u?.type ?? "private",
        aliases: (u?.aliases ?? []).join(", "),
        verified: u?.verified ?? true,
        active: u?.active ?? true,
      };
    }
    if (dialog.kind === "col") {
      const x = cols.find((y) => y.id === dialog.id);
      return { ar: x?.ar ?? "", en: x?.en ?? "" };
    }
    const x = majs.find((y) => y.id === dialog.id);
    return { en: x?.en ?? "", ar: x?.ar ?? "" };
  }, [dialog, unis, cols, majs]);

  if (isLoading) return <p className="text-sm text-muted-foreground">{c.loading}</p>;

  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const crumbBtn = "rounded px-1 underline-offset-2 hover:underline";

  const rows =
    level === "uni"
      ? unis.map((u) => ({
          id: u.id,
          title: u[lang],
          sub: `${c.colleges}: ${cols.filter((x) => x.university_id === u.id).length} · ${c.majors}: ${
            majs.filter((m) => cols.some((x) => x.id === m.college_id && x.university_id === u.id))
              .length
          }`,
          badges: [!u.verified ? c.notVerified : null, !u.active ? c.hidden : null],
          open: () => setUniId(u.id),
        }))
      : level === "col"
        ? cols
            .filter((x) => x.university_id === uniId)
            .map((x) => ({
              id: x.id,
              title: lang === "ar" ? x.ar : (x.en ?? x.ar),
              sub: `${c.majors}: ${majs.filter((m) => m.college_id === x.id).length}`,
              badges: [] as (string | null)[],
              open: () => setColId(x.id),
            }))
        : majs
            .filter((x) => x.college_id === colId)
            .map((x) => ({
              id: x.id,
              title: x[lang],
              sub: lang === "ar" ? x.en : x.ar,
              badges: [] as (string | null)[],
              open: undefined as (() => void) | undefined,
            }));

  const title = level === "uni" ? c.universities : level === "col" ? c.colleges : c.majors;
  const deleteNote = (k: "uni" | "col" | "maj") =>
    k === "uni" ? c.deleteUniversity : k === "col" ? c.deleteCollege : c.deleteMajor;

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{c.hint}</p>

      <nav
        className={`mb-3 flex-wrap items-center gap-1 text-sm ${level === "uni" ? "hidden" : "flex"}`}
        aria-label="breadcrumb"
      >
        <button
          className={crumbBtn + (level === "uni" ? " font-semibold" : "")}
          onClick={() => {
            setUniId(null);
            setColId(null);
          }}
        >
          {c.universities}
        </button>
        {uni ? (
          <>
            <Chevron className="size-4 text-muted-foreground" />
            <button
              className={crumbBtn + (level === "col" ? " font-semibold" : "")}
              onClick={() => setColId(null)}
            >
              {uni[lang]}
            </button>
          </>
        ) : null}
        {col ? (
          <>
            <Chevron className="size-4 text-muted-foreground" />
            <span className="font-semibold">{lang === "ar" ? col.ar : (col.en ?? col.ar)}</span>
          </>
        ) : null}
      </nav>

      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <Button size="sm" onClick={() => setDialog({ kind: level, id: null })}>
          <Plus className="me-1 size-4" />
          {c.add}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {c.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded-2xl border bg-card p-3 shadow-sm"
            >
              <button
                type="button"
                disabled={!r.open}
                onClick={r.open}
                className="min-w-0 flex-1 text-start disabled:cursor-default"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-words font-medium">{r.title}</span>
                  {r.badges.filter(Boolean).map((b) => (
                    <Badge key={b} variant="outline">
                      {b}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">{r.sub}</div>
              </button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={c.edit}
                onClick={() => setDialog({ kind: level, id: r.id })}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={c.delete}
                onClick={() => setToDelete({ kind: level, id: r.id, name: r.title })}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
              {r.open ? <Chevron className="size-4 shrink-0 text-muted-foreground" /> : null}
            </li>
          ))}
        </ul>
      )}

      <EntityDialog
        key={dialog ? `${dialog.kind}:${dialog.id ?? "new"}` : "closed"}
        open={!!dialog}
        title={`${dialog?.id ? c.edit : c.add} — ${
          dialog?.kind === "uni" ? c.universities : dialog?.kind === "col" ? c.colleges : c.majors
        }`}
        fields={fields}
        initial={initial}
        note={dialog?.id ? c.renameNote : undefined}
        saving={save.isPending}
        saveLabel={c.save}
        cancelLabel={c.cancel}
        onClose={() => setDialog(null)}
        onSubmit={(values) => dialog && save.mutate({ kind: dialog.kind, id: dialog.id, values })}
        labels={{ public: c.public, private: c.private }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {c.confirmDelete.replace("{name}", toDelete?.name ?? "")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? deleteNote(toDelete.kind) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) remove.mutate({ kind: toDelete.kind, id: toDelete.id });
              }}
            >
              {c.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EntityDialog({
  open,
  title,
  fields,
  initial,
  note,
  saving,
  saveLabel,
  cancelLabel,
  labels,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  fields: Field[];
  initial: Values;
  note: string | undefined;
  saving: boolean;
  saveLabel: string;
  cancelLabel: string;
  labels: { public: string; private: string };
  onClose: () => void;
  onSubmit: (values: Values) => void;
}) {
  const { dir } = useI18n();
  const [values, setValues] = useState<Values>(initial);
  const set = (k: string, v: string | boolean) => setValues((p) => ({ ...p, [k]: v }));
  const valid = fields.every(
    (f) => f.kind !== "text" || f.optional || String(values[f.key] ?? "").trim().length > 0,
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir={dir} className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSubmit(values);
          }}
        >
          {fields.map((f) =>
            f.kind === "text" ? (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                <Input
                  id={`f-${f.key}`}
                  dir={f.ltr ? "ltr" : undefined}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  maxLength={200}
                />
              </div>
            ) : f.kind === "type" ? (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Select value={String(values[f.key])} onValueChange={(v) => set(f.key, v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{labels.public}</SelectItem>
                    <SelectItem value="private">{labels.private}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                <Switch
                  id={`f-${f.key}`}
                  checked={values[f.key] === true}
                  onCheckedChange={(v) => set(f.key, v)}
                />
              </div>
            ),
          )}
          {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saveLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
