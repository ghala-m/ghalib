/**
 * Colleges a professor can belong to. The Arabic name is what gets stored in the existing
 * `professors.department` column (no migration needed), so older rows keep working and a
 * college name written by a student that is not in this list is still displayed as typed.
 */
export type College = { ar: string; en: string; chip: string; dot: string };

/** All colleges share the student's chosen theme colour (Settings → colours) — no fixed rainbow. */
const COLLEGE_CHIP = "bg-accent/15 text-foreground border-accent/40";
const COLLEGE_DOT = "bg-accent";

export const COLLEGES: College[] = [
  {
    ar: "كلية الدراسات التمهيدية",
    en: "Preparatory Studies",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الدراسات التكميلية",
    en: "Supplementary Studies",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية هندسة الحاسب والنظم",
    en: "Computer & Systems Engineering",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية علوم وتقنية المعلومات",
    en: "Computing & Information Technology",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الهندسة",
    en: "Engineering",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية العلوم",
    en: "Science",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية إدارة الأعمال",
    en: "Business Administration",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الطب",
    en: "Medicine",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الصيدلة",
    en: "Pharmacy",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية العمارة والتصميم",
    en: "Architecture & Design",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الآداب",
    en: "Arts",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية التربية",
    en: "Education",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الحقوق",
    en: "Law",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الشريعة",
    en: "Sharia",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية العلوم الاجتماعية",
    en: "Social Sciences",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية العلوم الطبية المساندة",
    en: "Allied Health Sciences",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية طب الأسنان",
    en: "Dentistry",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الصحة العامة",
    en: "Public Health",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الهندسة والبترول",
    en: "Engineering and Petroleum",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية علوم الحياة",
    en: "Life Sciences",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الآداب والعلوم",
    en: "Arts and Sciences",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الإدارة والاقتصاد",
    en: "Business and Economics",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الهندسة والعلوم التطبيقية",
    en: "Engineering and Applied Sciences",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الهندسة والتكنولوجيا",
    en: "Engineering and Technology",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الطيران",
    en: "School of Aviation",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "قطاع الدراسات البحرية",
    en: "Maritime Studies",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الدراسات التجارية",
    en: "Business Studies",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الدراسات الحاسوبية",
    en: "Computer Studies",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية دراسات اللغات",
    en: "Language Studies",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية هندسة الحاسوب والنظم",
    en: "Systems and Computer Engineering",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الهندسة والطاقة",
    en: "Engineering and Energy",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية إدارة وريادة الأعمال",
    en: "Business Management and Entrepreneurship",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الطب والعلوم الصحية",
    en: "Medicine and Health Sciences",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الدراسات التكاملية",
    en: "Integrative Studies",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية كويت ماسترخت لإدارة الأعمال",
    en: "Kuwait Maastricht Business School",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية الهندسة والعمارة",
    en: "Engineering and Architecture",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية العلوم والفنون",
    en: "Arts and Sciences",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية العمارة",
    en: "Architecture",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "كلية العلوم الإدارية",
    en: "Business Administration",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
  {
    ar: "أخرى",
    en: "Other",
    chip: COLLEGE_CHIP,
    dot: COLLEGE_DOT,
  },
];

const FALLBACK: College = {
  ar: "",
  en: "",
  chip: COLLEGE_CHIP,
  dot: COLLEGE_DOT,
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
