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
    ar: "كلية العلوم الاجتماعية",
    en: "Social Sciences",
    chip: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
    dot: "bg-yellow-500",
  },
  {
    ar: "كلية العلوم الطبية المساندة",
    en: "Allied Health Sciences",
    chip: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    dot: "bg-red-500",
  },
  {
    ar: "كلية طب الأسنان",
    en: "Dentistry",
    chip: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dot: "bg-blue-500",
  },
  {
    ar: "كلية الصحة العامة",
    en: "Public Health",
    chip: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    dot: "bg-purple-500",
  },
  {
    ar: "كلية الهندسة والبترول",
    en: "Engineering and Petroleum",
    chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    dot: "bg-orange-500",
  },
  {
    ar: "كلية علوم الحياة",
    en: "Life Sciences",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  {
    ar: "كلية الآداب والعلوم",
    en: "Arts and Sciences",
    chip: "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30",
    dot: "bg-lime-500",
  },
  {
    ar: "كلية الإدارة والاقتصاد",
    en: "Business and Economics",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
  },
  {
    ar: "كلية الهندسة والعلوم التطبيقية",
    en: "Engineering and Applied Sciences",
    chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    dot: "bg-orange-500",
  },
  {
    ar: "كلية الهندسة والتكنولوجيا",
    en: "Engineering and Technology",
    chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    dot: "bg-orange-500",
  },
  {
    ar: "كلية الطيران",
    en: "School of Aviation",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    dot: "bg-sky-500",
  },
  {
    ar: "قطاع الدراسات البحرية",
    en: "Maritime Studies",
    chip: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    dot: "bg-cyan-500",
  },
  {
    ar: "كلية الدراسات التجارية",
    en: "Business Studies",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
  },
  {
    ar: "كلية الدراسات الحاسوبية",
    en: "Computer Studies",
    chip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    dot: "bg-indigo-500",
  },
  {
    ar: "كلية دراسات اللغات",
    en: "Language Studies",
    chip: "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30",
    dot: "bg-lime-500",
  },
  {
    ar: "كلية هندسة الحاسوب والنظم",
    en: "Systems and Computer Engineering",
    chip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    dot: "bg-indigo-500",
  },
  {
    ar: "كلية الهندسة والطاقة",
    en: "Engineering and Energy",
    chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    dot: "bg-orange-500",
  },
  {
    ar: "كلية إدارة وريادة الأعمال",
    en: "Business Management and Entrepreneurship",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
  },
  {
    ar: "كلية الطب والعلوم الصحية",
    en: "Medicine and Health Sciences",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    dot: "bg-rose-500",
  },
  {
    ar: "كلية الدراسات التكاملية",
    en: "Integrative Studies",
    chip: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
    dot: "bg-slate-500",
  },
  {
    ar: "كلية كويت ماسترخت لإدارة الأعمال",
    en: "Kuwait Maastricht Business School",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
  },
  {
    ar: "كلية الهندسة والعمارة",
    en: "Engineering and Architecture",
    chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    dot: "bg-orange-500",
  },
  {
    ar: "كلية العلوم والفنون",
    en: "Arts and Sciences",
    chip: "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30",
    dot: "bg-lime-500",
  },
  {
    ar: "كلية العمارة",
    en: "Architecture",
    chip: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
    dot: "bg-fuchsia-500",
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
