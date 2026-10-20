/**
 * Colleges a professor can belong to. The Arabic name is what gets stored in the existing
 * `professors.department` column (no migration needed), so older rows keep working and a
 * college name written by a student that is not in this list is still displayed as typed.
 */
export type College = { ar: string; en: string; chip: string; dot: string };

export const COLLEGES: College[] = [
  {
    ar: "كلية الدراسات التمهيدية",
    en: "Preparatory Studies",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    dot: "bg-sky-500",
  },
  {
    ar: "كلية الدراسات التكميلية",
    en: "Supplementary Studies",
    chip: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
    dot: "bg-teal-500",
  },
  {
    ar: "كلية هندسة الحاسب والنظم",
    en: "Computer & Systems Engineering",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
    dot: "bg-violet-500",
  },
  {
    ar: "كلية علوم وتقنية المعلومات",
    en: "Computing & Information Technology",
    chip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    dot: "bg-indigo-500",
  },
  {
    ar: "كلية الهندسة",
    en: "Engineering",
    chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    dot: "bg-orange-500",
  },
  {
    ar: "كلية العلوم",
    en: "Science",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  {
    ar: "كلية إدارة الأعمال",
    en: "Business Administration",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
  },
  {
    ar: "كلية الطب",
    en: "Medicine",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    dot: "bg-rose-500",
  },
  {
    ar: "كلية الصيدلة",
    en: "Pharmacy",
    chip: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
    dot: "bg-pink-500",
  },
  {
    ar: "كلية العمارة والتصميم",
    en: "Architecture & Design",
    chip: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
    dot: "bg-fuchsia-500",
  },
  {
    ar: "كلية الآداب",
    en: "Arts",
    chip: "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30",
    dot: "bg-lime-500",
  },
  {
    ar: "كلية التربية",
    en: "Education",
    chip: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    dot: "bg-cyan-500",
  },
  {
    ar: "كلية الحقوق",
    en: "Law",
    chip: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30",
    dot: "bg-stone-500",
  },
  {
    ar: "كلية الشريعة",
    en: "Sharia",
    chip: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
    dot: "bg-green-500",
  },
  {
    ar: "أخرى",
    en: "Other",
    chip: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
    dot: "bg-slate-500",
  },
];

const FALLBACK: College = {
  ar: "",
  en: "",
  chip: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  dot: "bg-slate-500",
};

export function findCollege(stored: string): College | undefined {
  const v = stored.trim();
  return COLLEGES.find((c) => c.ar === v || c.en.toLowerCase() === v.toLowerCase());
}

/** Localised label for a stored college value (unknown free-text values are shown as typed). */
export function collegeLabel(stored: string, lang: "ar" | "en"): string {
  const c = findCollege(stored);
  return c ? c[lang] : stored.trim();
}

export function collegeStyle(stored: string): College {
  return findCollege(stored) ?? FALLBACK;
}

/** Case/space-insensitive comparison so "Kuwait University " and "kuwait university" match. */
export function sameUniversity(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const norm = (x: string | null | undefined) =>
    (x ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return norm(a) !== "" && norm(a) === norm(b);
}
