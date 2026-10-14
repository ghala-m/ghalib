import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useId } from "react";
import { useI18n } from "@/lib/i18n";
import { STUDY_COPY, type StudyOptions } from "@/lib/study-options";

export function StudyPlanOptions({ value, onChange, disabled = false }: { value: StudyOptions; onChange: (value: StudyOptions) => void; disabled?: boolean }) {
  const { lang } = useI18n(); const c = STUDY_COPY[lang]; const id = useId();
  const patch = (update: Partial<StudyOptions>) => onChange({ ...value, ...update });
  const names = lang === "ar" ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return <fieldset disabled={disabled} className="space-y-4 border-y border-border py-5">
    <legend className="px-2 font-semibold text-primary">{c.available}</legend>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="space-y-2"><Label htmlFor={`${id}-days`}>{c.days}</Label><Input id={`${id}-days`} type="number" min={1} max={60} value={Number.isNaN(value.days) ? "" : value.days} onChange={e => patch({ days: e.target.valueAsNumber })} /></div>
      <div className="space-y-2"><Label htmlFor={`${id}-date`}>{c.start}</Label><Input id={`${id}-date`} type="date" value={value.startDate} onChange={e => patch({ startDate: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor={`${id}-time`}>{c.time}</Label><Input id={`${id}-time`} type="time" value={value.startTime} onChange={e => patch({ startTime: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor={`${id}-minutes`}>{c.minutes}</Label><Input id={`${id}-minutes`} type="number" min={15} max={480} value={Number.isNaN(value.minutes) ? "" : value.minutes} onChange={e => patch({ minutes: e.target.valueAsNumber })} /></div>
    </div>
    <div className="space-y-2"><Label>{c.weekdays}</Label><div className="flex flex-wrap gap-2">{names.map((name, day) => <Button key={day} type="button" size="sm" variant={value.weekdays.includes(day) ? "default" : "outline"} disabled={disabled} aria-pressed={value.weekdays.includes(day)} onClick={() => patch({ weekdays: value.weekdays.includes(day) ? value.weekdays.filter(x => x !== day) : [...value.weekdays, day] })}>{name}</Button>)}</div></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor={`${id}-quantity`}>{c.quantity}</Label><Input id={`${id}-quantity`} type="number" min={1} max={10000} placeholder={c.auto} value={value.quantity === null || Number.isNaN(value.quantity) ? "" : value.quantity} onChange={e => patch({ quantity: e.target.value ? e.target.valueAsNumber : null })} /></div>
      <div className="space-y-2"><Label htmlFor={`${id}-unit`}>{c.unit}</Label><Select value={value.unit} disabled={disabled} onValueChange={unit => patch({ unit: unit as StudyOptions["unit"] })}><SelectTrigger id={`${id}-unit`}><SelectValue /></SelectTrigger><SelectContent>{(["pages", "chapters", "slides", "topics"] as const).map(unit => <SelectItem key={unit} value={unit}>{c[unit]}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <div className="space-y-2"><Label htmlFor={`${id}-goal`}>{c.goal}</Label><Textarea id={`${id}-goal`} rows={2} maxLength={500} placeholder={c.goalPlaceholder} value={value.goal} onChange={e => patch({ goal: e.target.value })} /></div>
  </fieldset>;
}