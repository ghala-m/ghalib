import { useEffect, useRef, useState } from "react";
import { isMissingSchemaError } from "@/lib/db-errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus, CalendarRange, FlagOff, Search, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { coursesQuery, profileQuery, termsQuery } from "@/lib/queries";
import { GRADE_SCALE, pointsFor } from "@/lib/plan";
import { completedGpa } from "@/lib/gpa";
import { parseAcademicCalendar, type AcademicCalendar } from "@/lib/academic-calendar.functions";
import {
  ACCEPTED_DOCS_AND_IMAGES,
  isAcceptedDocOrImage,
  prepareDocumentOrImage,
} from "@/lib/files";

export function TermControls() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: terms = [] } = useQuery(termsQuery());
  const { data: courses = [] } = useQuery(coursesQuery());

  const activeTerm = terms.find((x) => x.is_active) ?? null;
  const currentCourses = courses.filter((c) => c.status === "current" && !c.archived);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["terms"] });
    qc.invalidateQueries({ queryKey: ["courses"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-5">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{t("activeTerm")}</p>
        <p className="truncate font-semibold">
          {activeTerm
            ? `${activeTerm.name} · ${t("termNumber")} ${activeTerm.term_number}`
            : t("noActiveTerm")}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {currentCourses.length} · {t("current")}
        </p>
      </div>
      {activeTerm ? (
        <Button size="sm" variant="outline" asChild>
          <Link to="/term-calendar">
            <CalendarRange className="size-4" />
            {t("viewTermCalendar")}
          </Link>
        </Button>
      ) : null}
      <StartTermDialog
        nextNumber={(profile?.term_number ?? terms.length) + (activeTerm ? 1 : 0)}
        onDone={invalidate}
      />
      {activeTerm ? <EndTermDialog termId={activeTerm.id} onDone={invalidate} /> : null}
    </div>
  );
}

function StartTermDialog({ nextNumber, onDone }: { nextNumber: number; onDone: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: courses = [] } = useQuery(coursesQuery());
  const [name, setName] = useState("");
  const [number, setNumber] = useState(String(Math.max(1, nextNumber)));
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [expectedEnd, setExpectedEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 16 * 7); // default: a typical ~16-week term, editable
    return d.toISOString().slice(0, 10);
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [weeksCount, setWeeksCount] = useState("");
  const [calendarText, setCalendarText] = useState("");
  const [milestones, setMilestones] = useState<AcademicCalendar["events"]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const parseCalendar = useServerFn(parseAcademicCalendar);

  useEffect(() => {
    if (open) {
      setNumber(String(Math.max(1, nextNumber)));
      setPicked(courses.filter((c) => c.status === "current" && !c.archived).map((c) => c.id));
      setWeeksCount("");
      setCalendarText("");
      setMilestones([]);
    }
  }, [open, nextNumber, courses]);

  const extract = useMutation({
    mutationFn: async (file: File | null) => {
      let payload: { base64: string; mediaType: string } | { text: string };
      if (file) {
        if (!isAcceptedDocOrImage(file)) throw new Error("INVALID_FILE");
        const doc = await prepareDocumentOrImage(file);
        payload =
          doc.kind === "text"
            ? { text: doc.text }
            : { base64: doc.base64, mediaType: doc.mediaType };
      } else if (calendarText.trim()) {
        payload = { text: calendarText.trim() };
      } else {
        throw new Error("NOTHING_TO_PARSE");
      }
      return (await parseCalendar({ data: payload })) as AcademicCalendar;
    },
    onSuccess: (data) => {
      if (data.term_name && !name.trim()) setName(data.term_name);
      if (data.start_date) setStart(data.start_date);
      if (data.end_date) setExpectedEnd(data.end_date);
      if (data.weeks_count) setWeeksCount(String(data.weeks_count));
      setMilestones(data.events);
      toast.success(t("calendarExtracted"));
    },
    onError: (e: Error) => {
      if (e.message.includes("NOTHING_TO_PARSE")) toast.error(t("uploadOrPasteCalendar"));
      else if (e.message.includes("INVALID_FILE")) toast.error(t("invalidFile"));
      else if (e.message.includes("FILE_TOO_LARGE")) toast.error(t("fileTooLarge"));
      else if (e.message.includes("Missing LOVABLE_API_KEY")) toast.error(t("aiKeyMissing"));
      else if (e.message.includes("RATE_LIMIT")) toast.error(t("aiRateLimit"));
      else if (e.message.includes("NO_CREDITS")) toast.error(t("aiCredits"));
      else toast.error(t("aiFailed"));
    },
  });

  const selectable = courses.filter((c) => !c.archived && c.status !== "completed");
  const filteredSelectable = courseSearch.trim()
    ? selectable.filter((c) =>
        `${c.code ?? ""} ${c.name}`.toLowerCase().includes(courseSearch.trim().toLowerCase()),
      )
    : selectable;

  const run = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      await supabase
        .from("terms")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);
      const { data: inserted, error } = await supabase
        .from("terms")
        .insert({
          user_id: user.id,
          name: name.trim() || `Term ${number}`,
          term_number: Number(number) || 1,
          start_date: start || null,
          end_date: expectedEnd || null,
          weeks_count: weeksCount ? Number(weeksCount) : null,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (milestones.length && inserted) {
        await supabase.from("term_calendar_events").insert(
          milestones.map((m) => ({
            user_id: user.id,
            term_id: inserted.id,
            title: m.title,
            event_type: m.type,
            start_date: m.start_date,
            end_date: m.end_date,
          })),
        );
      }
      await supabase
        .from("profiles")
        .update({ current_term: name.trim() || `Term ${number}`, term_number: Number(number) || 1 })
        .eq("id", user.id);
      if (picked.length) {
        await supabase
          .from("courses")
          .update({ status: "current", term: name.trim() || `Term ${number}` })
          .in("id", picked);
      }
      const unpicked = selectable
        .filter((c) => c.status === "current" && !picked.includes(c.id))
        .map((c) => c.id);
      if (unpicked.length)
        await supabase.from("courses").update({ status: "future" }).in("id", unpicked);
    },
    onSuccess: () => {
      onDone();
      setOpen(false);
      toast.success(t("termStarted"));
    },
    onError: (e: Error) =>
      toast.error(isMissingSchemaError(e) ? t("migrationMissingHint") : t("saveFailed")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CalendarPlus className="size-4" />
          {t("startTerm")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("startTerm")}</DialogTitle>
          <DialogDescription>{t("startTermHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("termName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fall 2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("termNumber")}</Label>
              <Input
                type="number"
                min={1}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("startDate")}</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("expectedEndDate")}</Label>
              <Input
                type="date"
                value={expectedEnd}
                onChange={(e) => setExpectedEnd(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("expectedEndDateHint")}</p>

          <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
            <Label className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-accent" />
              {t("academicCalendarExtract")}
            </Label>
            <p className="text-xs text-muted-foreground">{t("academicCalendarExtractHint")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_DOCS_AND_IMAGES}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) extract.mutate(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={extract.isPending}
              >
                <Upload className="size-3.5" />
                {t("uploadCalendarFile")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={extract.isPending || !calendarText.trim()}
                onClick={() => extract.mutate(null)}
              >
                <Sparkles className="size-3.5" />
                {extract.isPending ? t("extracting") : t("extractFromText")}
              </Button>
            </div>
            <Textarea
              value={calendarText}
              onChange={(e) => setCalendarText(e.target.value)}
              placeholder={t("pasteCalendarPlaceholder")}
              className="min-h-20 text-xs"
            />
            {milestones.length ? (
              <div className="space-y-1 rounded-lg bg-muted/40 p-2">
                <p className="text-xs font-medium">
                  {t("extractedMilestones")} ({milestones.length})
                  {weeksCount ? ` · ${t("weeksCountLabel")}: ${weeksCount}` : ""}
                </p>
                <ul className="max-h-32 space-y-1 overflow-y-auto">
                  {milestones.map((m, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate">
                        {m.title} <span className="text-muted-foreground">· {m.start_date}</span>
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setMilestones((s) => s.filter((_, idx) => idx !== i))}
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div>
            <Label>{t("selectCourses")}</Label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder={t("searchCourses")}
                className="ps-8"
              />
            </div>
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {filteredSelectable.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={picked.includes(c.id)}
                    onCheckedChange={(v) =>
                      setPicked((s) => (v === true ? [...s, c.id] : s.filter((id) => id !== c.id)))
                    }
                  />
                  <span className="truncate">
                    {c.code ? <span className="text-muted-foreground">{c.code} · </span> : null}
                    {c.name}
                  </span>
                </li>
              ))}
              {!filteredSelectable.length && (
                <li className="p-2 text-sm text-muted-foreground">{t("noCourses")}</li>
              )}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button disabled={run.isPending} onClick={() => run.mutate()}>
            {t("startTerm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EndTermDialog({ termId, onDone }: { termId: string; onDone: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: courses = [] } = useQuery(coursesQuery());
  const { data: profile } = useQuery(profileQuery(user?.id));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [grades, setGrades] = useState<Record<string, string>>({});

  const current = courses.filter((c) => c.status === "current" && !c.archived);

  useEffect(() => {
    if (open) setGrades(Object.fromEntries(current.map((c) => [c.id, c.final_grade ?? ""])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const termGpa = (() => {
    let pts = 0;
    let cr = 0;
    for (const c of current) {
      const p = pointsFor(grades[c.id] || null);
      if (p === null) continue;
      const credits = c.credits ?? 3;
      pts += p * credits;
      cr += credits;
    }
    return cr ? { gpa: pts / cr, credits: cr } : null;
  })();

  const run = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      const termName = profile?.current_term ?? null;
      for (const c of current) {
        const grade = grades[c.id]?.trim() || null;
        await supabase
          .from("courses")
          .update({
            status: "completed",
            final_grade: grade,
            grade_points: pointsFor(grade),
            completed_term: termName,
          })
          .eq("id", c.id);
      }
      await supabase
        .from("terms")
        .update({
          is_active: false,
          end_date: end || null,
          gpa: termGpa?.gpa ?? null,
          credits: termGpa?.credits ?? null,
        })
        .eq("id", termId);

      const completed = courses.filter((c) => c.status === "completed" && !c.archived);
      const merged = [...completed, ...current].map((c) =>
        current.some((x) => x.id === c.id) ? { ...c, final_grade: grades[c.id] || null } : c,
      );
      const totals = completedGpa(merged);
      await supabase
        .from("profiles")
        .update({
          overall_gpa: totals.gpa !== null ? Number(totals.gpa.toFixed(2)) : null,
          semester_gpa: termGpa ? Number(termGpa.gpa.toFixed(2)) : null,
          total_credits: totals.credits,
          term_number: (profile?.term_number ?? 1) + 1,
        })
        .eq("id", user.id);
    },
    onSuccess: () => {
      onDone();
      setOpen(false);
      toast.success(t("termEnded"));
    },
    onError: (e: Error) =>
      toast.error(isMissingSchemaError(e) ? t("migrationMissingHint") : t("saveFailed")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FlagOff className="size-4" />
          {t("endTerm")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("endTerm")}</DialogTitle>
          <DialogDescription>{t("endTermHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("endDate")}</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <Label>{t("grade")}</Label>
            <ul className="mt-2 space-y-2">
              {current.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm">{c.code || c.name}</span>
                  <Select
                    value={grades[c.id] ?? ""}
                    onValueChange={(v) => setGrades((s) => ({ ...s, [c.id]: v }))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_SCALE.map((g) => (
                        <SelectItem key={g.grade} value={g.grade}>
                          {g.grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
              {!current.length && (
                <li className="text-sm text-muted-foreground">{t("noCourses")}</li>
              )}
            </ul>
          </div>
          {termGpa ? (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              {t("termGpa")}: <strong className="tabular-nums">{termGpa.gpa.toFixed(2)}</strong>
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button disabled={run.isPending} onClick={() => run.mutate()}>
            {t("endTerm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
