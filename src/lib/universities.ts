import { COLLEGES, type College } from "@/lib/colleges";

/**
 * University catalog. The student picks a university once (onboarding / settings) and every
 * college dropdown in the app is filtered by it, since not every university has every college
 * (e.g. not all have an Arts college).
 *
 * `official` is the stable official name stored in `profiles.university` and
 * `professors.university` — keep it unchanged once shipped. `colleges` are Arabic college names
 * taken from COLLEGES (the value stored in `professors.department`).
 *
 * ⚠ Edit this list to match reality: add universities, and trim/extend each `colleges` array.
 */
export type University = {
  official: string;
  ar: string;
  en: string;
  /** Other spellings that should resolve to this entry (old free-text profile values). */
  aliases?: string[];
  colleges: string[];
};

const ALL_COLLEGE_NAMES = COLLEGES.map((c) => c.ar);

export const UNIVERSITIES: University[] = [
  {
    official: "Kuwait University",
    ar: "جامعة الكويت",
    en: "Kuwait University",
    aliases: ["KU", "Kuwait Univ"],
    colleges: [
      "كلية الدراسات التمهيدية",
      "كلية الدراسات التكميلية",
      "كلية هندسة الحاسب والنظم",
      "كلية علوم وتقنية المعلومات",
      "كلية الهندسة",
      "كلية العلوم",
      "كلية إدارة الأعمال",
      "كلية الطب",
      "كلية الصيدلة",
      "كلية العمارة والتصميم",
      "كلية الآداب",
      "كلية التربية",
      "كلية الحقوق",
      "كلية الشريعة",
      "كلية العلوم الاجتماعية",
      "كلية العلوم الطبية المساندة",
      "كلية طب الأسنان",
      "كلية الصحة العامة",
      "أخرى",
    ],
  },
  {
    official: "Gulf University for Science and Technology",
    ar: "الجامعة الخليجية للعلوم والتكنولوجيا",
    en: "Gulf University for Science and Technology",
    aliases: ["GUST"],
    colleges: ["كلية الهندسة", "كلية إدارة الأعمال", "كلية الآداب", "كلية العلوم", "أخرى"],
  },
  {
    official: "American University of Kuwait",
    ar: "الجامعة الأمريكية في الكويت",
    en: "American University of Kuwait",
    aliases: ["AUK"],
    colleges: ["كلية الهندسة", "كلية إدارة الأعمال", "كلية الآداب", "كلية العلوم", "أخرى"],
  },
  {
    official: "American University of the Middle East",
    ar: "الجامعة الأمريكية في الشرق الأوسط",
    en: "American University of the Middle East",
    aliases: ["AUM"],
    colleges: [
      "كلية الهندسة",
      "كلية إدارة الأعمال",
      "كلية العمارة والتصميم",
      "كلية الآداب",
      "كلية علوم وتقنية المعلومات",
      "أخرى",
    ],
  },
  {
    official: "Arab Open University - Kuwait",
    ar: "الجامعة العربية المفتوحة - الكويت",
    en: "Arab Open University - Kuwait",
    aliases: ["AOU", "Arab Open University"],
    colleges: ["كلية علوم وتقنية المعلومات", "كلية إدارة الأعمال", "كلية الآداب", "أخرى"],
  },
  {
    official: "Australian College of Kuwait",
    ar: "الكلية الأسترالية في الكويت",
    en: "Australian College of Kuwait",
    aliases: ["ACK"],
    colleges: ["كلية الهندسة", "كلية إدارة الأعمال", "كلية العلوم", "أخرى"],
  },
  {
    official: "Kuwait College of Science and Technology",
    ar: "كلية الكويت للعلوم والتكنولوجيا",
    en: "Kuwait College of Science and Technology",
    aliases: ["KCST"],
    colleges: ["كلية الهندسة", "كلية علوم وتقنية المعلومات", "كلية إدارة الأعمال", "أخرى"],
  },
];

/** Sentinel select value for a university that is not in the catalog. */
export const OTHER_UNIVERSITY = "__other__";

const norm = (x: string | null | undefined) => (x ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export function findUniversity(stored: string | null | undefined): University | undefined {
  const v = norm(stored);
  if (!v) return undefined;
  return UNIVERSITIES.find((u) =>
    [u.official, u.ar, u.en, ...(u.aliases ?? [])].some((n) => norm(n) === v),
  );
}

export function universityLabel(stored: string | null | undefined, lang: "ar" | "en"): string {
  const u = findUniversity(stored);
  return u ? u[lang] : (stored ?? "").trim();
}

/**
 * Colleges offered for a university. An unknown / custom university gets the full list so the
 * student is never blocked from adding a professor.
 */
export function collegesForUniversity(stored: string | null | undefined): College[] {
  const u = findUniversity(stored);
  const names = u ? u.colleges : ALL_COLLEGE_NAMES;
  return COLLEGES.filter((c) => names.includes(c.ar));
}
