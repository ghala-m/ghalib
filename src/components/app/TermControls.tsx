import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, FlagOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { coursesQuery, profileQuery, termsQuery } from "@/lib/queries";
import { pointsFor } from "@/lib/plan";

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
          {activeTerm ? `${activeTerm.name} · ${t("termNumber")} ${activeTerm.term_number}` : t("noActiveTerm")}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {currentCourses.length} · {t("current")}
        </p>
      </div>
      <StartTermDialog nextNumber={(profile?.term_number ?? terms.length) + (activeTerm ? 1 : 0)} onDone={invalidate} />
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
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setNumber(String(Math.max(1, nextNumber)));
      setPicked(courses.filter((c) => c.status === "current" && !c.archived).map((c) => c.id));
    }
  }, [open, nextNumber, courses]);

  const selectable = courses.filter((c) => !c.archived && c.status !== "completed");

  const run = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      await supabase.from("terms").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);
      const { error } = await supabase.from("terms").insert({
        user_id: user.id,
        name: name.trim() || `Term ${number}`,
        term_number: Number(number) || 1,
        start_date: start || null,
        is_active: true,
      });
      if (error) throw error;
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
      const unpicked = selectable.filter((c) => c.status === "current" && !picked.includes(c.id)).map((c) => c.id);
      if (unpicked.length) await supabase.from("courses").update({ status: "future" }).in("id", unpicked);
    },
    onSuccess: () => {
      onDone();
      setOpen(false);
      toast.success(t("termStarted"));
    },
    onError: () => toast.error(t("saveFailed")),
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
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fall 2026" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("termNumber")}</Label>
              <Input type="number" min={1} value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("startDate")}</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label>{t("selectCourses")}</Label>
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {selectable.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50">
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
              {!selectable.length && <li className="p-2 text-sm text-muted-foreground">{t("noCourses")}</li>}
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
        .update({ is_active: false, end_date: end || null, gpa: termGpa?.gpa ?? null, credits: termGpa?.credits ?? null })
        .eq("id", termId);

      const completed = courses.filter((c) => c.status === "completed" && !c.archived);
      let pts = 0;
      let cr = 0;
      for (const c of [...completed, ...current]) {
        const grade = current.some((x) => x.id === c.id) ? grades[c.id] : c.final_grade;
        const p = pointsFor(grade || null);
        if (p === null) continue;
        const credits = c.credits ?? 3;
        pts += p * credits;
        cr += credits;
      }
      await supabase
        .from("profiles")
        .update({
          overall_gpa: cr ? Number((pts / cr).toFixed(2)) : null,
          semester_gpa: termGpa ? Number(termGpa.gpa.toFixed(2)) : null,
          total_credits: cr,
          term_number: (profile?.term_number ?? 1) + 1,
        })
        .eq("id", user.id);
    },
    onSuccess: () => {
      onDone();
      setOpen(false);
      toast.success(t("termEnded"));
    },
    onError: () => toast.error(t("saveFailed")),
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
                  <Input
                    className="w-24"
                    placeholder="A"
                    value={grades[c.id] ?? ""}
                    onChange={(e) => setGrades((s) => ({ ...s, [c.id]: e.target.value }))}
                  />
                </li>
              ))}
              {!current.length && <li className="text-sm text-muted-foreground">{t("noCourses")}</li>}
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
