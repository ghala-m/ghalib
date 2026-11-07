import { COLLEGES, type College } from "@/lib/colleges";

/**
 * Kuwait university catalog: University → College → Major. Every dropdown in the app (onboarding,
 * settings, professor forum) reads from here, so fixing a name or adding a major is a one-file edit.
 *
 * Stored values (never rename these once students have data):
 *  - university: `official` (English official name)  → profiles.university / professors.university
 *  - college:    the Arabic name, which must exist in COLLEGES → profiles.college / professors.department
 *  - major:      the English name                     → profiles.major
 *
 * Sources: each university's official site / admission pages and Wikipedia (see the research notes
 * in the PR). `verified: false` entries could only be confirmed partially — the pickers always
 * offer "Other" so students are never blocked.
 */
export type Major = { en: string; ar: string };
export type UniversityCollege = { ar: string; majors: Major[] };
export type University = {
  official: string;
  ar: string;
  en: string;
  type: "public" | "private";
  /** Other spellings that should resolve to this entry (old free-text profile values). */
  aliases?: string[];
  /** false = college/major list is incomplete and should be double-checked with the university. */
  verified: boolean;
  colleges: UniversityCollege[];
};

const m = (en: string, ar: string): Major => ({ en, ar });

export const UNIVERSITIES: University[] = [
  {
    official: "Kuwait University",
    ar: "جامعة الكويت",
    en: "Kuwait University",
    type: "public",
    aliases: ["KU", "Kuwait Univ"],
    verified: true,
    colleges: [
      {
        ar: "كلية الآداب",
        majors: [
          m("Arabic Language and Literature", "اللغة العربية وآدابها"),
          m("English Language and Literature", "اللغة الإنجليزية وآدابها"),
          m("French Language and Literature", "اللغة الفرنسية وآدابها"),
          m("History", "التاريخ"),
          m("Philosophy", "الفلسفة"),
          m("Mass Communication", "الإعلام"),
        ],
      },
      {
        ar: "كلية العلوم",
        majors: [
          m("Biological Sciences", "العلوم البيولوجية"),
          m("Chemistry", "الكيمياء"),
          m("Earth and Environmental Sciences", "علوم الأرض والبيئة"),
          m("Marine Sciences", "علوم البحار"),
          m("Mathematics", "الرياضيات"),
          m("Financial and Actuarial Mathematics", "الرياضيات المالية والاكتوارية"),
          m("Physics", "الفيزياء"),
          m("Statistics and Operations Research", "الإحصاء وبحوث العمليات"),
          m("Applied Statistics", "الإحصاء التطبيقي"),
          m("Computer Science", "علوم الحاسوب"),
          m("Computer Science (Cybersecurity)", "علوم الحاسوب (الأمن السيبراني)"),
        ],
      },
      {
        ar: "كلية الهندسة والبترول",
        majors: [
          m("Chemical Engineering", "الهندسة الكيميائية"),
          m("Civil Engineering", "الهندسة المدنية"),
          m("Computer Engineering", "هندسة الحاسوب"),
          m("Electrical Engineering", "الهندسة الكهربائية"),
          m("Industrial and Management Systems Engineering", "الهندسة الصناعية ونظم الإدارة"),
          m("Mechanical Engineering", "الهندسة الميكانيكية"),
          m("Petroleum Engineering", "هندسة البترول"),
        ],
      },
      {
        ar: "كلية إدارة الأعمال",
        majors: [
          m("Accounting", "المحاسبة"),
          m("Economics", "الاقتصاد"),
          m("Finance and Financial Institutions", "المالية والمؤسسات المالية"),
          m("Management and Marketing", "الإدارة والتسويق"),
          m("Public Administration", "الإدارة العامة"),
          m("Information Systems and Operation Management", "نظم المعلومات وإدارة العمليات"),
        ],
      },
      {
        ar: "كلية علوم الحياة",
        majors: [
          m("Information Science", "علوم المعلومات"),
          m("Data Science and Artificial Intelligence", "علم البيانات والذكاء الاصطناعي"),
          m("Food Science and Nutrition", "علوم الأغذية والتغذية"),
          m("Environmental Technology Management", "إدارة التقنية البيئية"),
        ],
      },
      {
        ar: "كلية العلوم الاجتماعية",
        majors: [
          m("Geography", "الجغرافيا"),
          m("Political Science", "العلوم السياسية"),
          m("Psychology", "علم النفس"),
          m("Sociology and Social Work", "علم الاجتماع والخدمة الاجتماعية"),
        ],
      },
      {
        ar: "كلية التربية",
        majors: [
          m("Early Childhood Education", "تربية الطفولة المبكرة"),
          m("Elementary Education", "التعليم الابتدائي"),
          m("Middle and Secondary Education", "التعليم المتوسط والثانوي"),
        ],
      },
      {
        ar: "كلية العلوم الطبية المساندة",
        majors: [
          m("Occupational Therapy", "العلاج الوظيفي"),
          m("Physical Therapy", "العلاج الطبيعي"),
          m("Radiologic Sciences", "علوم الأشعة"),
          m("Medical Laboratory Sciences", "علوم المختبرات الطبية"),
          m("Health Information Management", "إدارة المعلومات الصحية"),
        ],
      },
      {
        ar: "كلية الصحة العامة",
        majors: [
          m("Environmental and Occupational Health", "الصحة البيئية والمهنية"),
          m("Epidemiology and Biostatistics", "الوبائيات والإحصاء الحيوي"),
          m("Health Policy and Management", "السياسات والإدارة الصحية"),
          m("Social and Behavioral Sciences", "العلوم الاجتماعية والسلوكية"),
        ],
      },
      { ar: "كلية الطب", majors: [m("Medicine", "الطب البشري")] },
      { ar: "كلية الصيدلة", majors: [m("Pharmacy (PharmD)", "الصيدلة (دكتور صيدلة)")] },
      { ar: "كلية طب الأسنان", majors: [m("Dentistry", "طب الأسنان")] },
      { ar: "كلية الحقوق", majors: [m("Law", "القانون")] },
      {
        ar: "كلية العمارة والتصميم",
        majors: [
          m("Architecture", "العمارة"),
          m("Visual Communication and Interiors", "الاتصال البصري والتصميم الداخلي"),
        ],
      },
      {
        ar: "كلية الشريعة",
        majors: [
          m("Dawah and Creed", "الدعوة والعقيدة"),
          m("Hadith and Quran Interpretation", "التفسير والحديث"),
          m("Fiqh and Usul Al-Fiqh", "الفقه وأصوله"),
          m("Comparative Jurisprudence", "الفقه المقارن"),
          m("Sharia Politics", "السياسة الشرعية"),
        ],
      },
    ],
  },
  {
    official: "Gulf University for Science and Technology",
    ar: "الجامعة الخليجية للعلوم والتكنولوجيا",
    en: "Gulf University for Science and Technology",
    type: "private",
    aliases: ["GUST"],
    verified: false,
    colleges: [
      {
        ar: "كلية الآداب والعلوم",
        majors: [
          m("Computer Science", "علوم الحاسوب"),
          m("English Linguistics", "اللغويات الإنجليزية"),
          m("English Translation", "الترجمة الإنجليزية"),
          m("English Literature", "الأدب الإنجليزي"),
          m("English Education", "تعليم اللغة الإنجليزية"),
          m("Mass Communication and Multimedia", "الإعلام والوسائط المتعددة"),
          m("Mathematics", "الرياضيات"),
        ],
      },
      {
        ar: "كلية إدارة الأعمال",
        majors: [
          m("Accounting", "المحاسبة"),
          m("Business Administration", "إدارة الأعمال"),
          m("Finance", "المالية"),
          m("Management Information Systems", "نظم المعلومات الإدارية"),
        ],
      },
    ],
  },
  {
    official: "American University of Kuwait",
    ar: "الجامعة الأمريكية في الكويت",
    en: "American University of Kuwait",
    type: "private",
    aliases: ["AUK"],
    verified: true,
    colleges: [
      {
        ar: "كلية الآداب والعلوم",
        majors: [
          m("Design", "التصميم"),
          m("Communication and Media", "الاتصال والإعلام"),
          m("English", "اللغة الإنجليزية"),
          m("International Relations", "العلاقات الدولية"),
          m("Social and Behavioral Science", "العلوم الاجتماعية والسلوكية"),
        ],
      },
      {
        ar: "كلية الأعمال والاقتصاد",
        majors: [
          m("Accounting", "المحاسبة"),
          m("Marketing", "التسويق"),
          m("Management", "الإدارة"),
          m("Finance", "المالية"),
          m("Economics", "الاقتصاد"),
          m("Human Resource Management", "إدارة الموارد البشرية"),
        ],
      },
      {
        ar: "كلية الهندسة والعلوم التطبيقية",
        majors: [
          m("Electrical Engineering", "الهندسة الكهربائية"),
          m("Computer Engineering", "هندسة الحاسوب"),
          m("Systems Engineering", "هندسة النظم"),
          m("Computer Science", "علوم الحاسوب"),
          m("Information Systems", "نظم المعلومات"),
        ],
      },
    ],
  },
  {
    official: "American University of the Middle East",
    ar: "الجامعة الأمريكية في الشرق الأوسط",
    en: "American University of the Middle East",
    type: "private",
    aliases: ["AUM"],
    verified: true,
    colleges: [
      {
        ar: "كلية الهندسة والتقنية",
        majors: [
          m("Architectural Engineering", "الهندسة المعمارية"),
          m("Civil Engineering", "الهندسة المدنية"),
          m("Industrial Engineering", "الهندسة الصناعية"),
          m("Computer Engineering", "هندسة الحاسوب"),
          m("Electrical Engineering", "الهندسة الكهربائية"),
          m("Mechanical Engineering", "الهندسة الميكانيكية"),
          m("Chemical Engineering", "الهندسة الكيميائية"),
          m("Information System and Technology", "نظم وتقنية المعلومات"),
          m("Telecommunications and Networking Technology", "تقنية الاتصالات والشبكات"),
        ],
      },
      {
        ar: "كلية إدارة الأعمال",
        majors: [m("Accounting", "المحاسبة"), m("Business Administration", "إدارة الأعمال")],
      },
    ],
  },
  {
    official: "Australian College of Kuwait",
    ar: "الكلية الأسترالية في الكويت",
    en: "Australian College of Kuwait",
    type: "private",
    aliases: ["ACK", "Australian University", "Australian University of Kuwait"],
    verified: false,
    colleges: [
      {
        ar: "كلية الهندسة",
        majors: [
          m("Civil Engineering", "الهندسة المدنية"),
          m("Mechanical Engineering", "الهندسة الميكانيكية"),
          m("Electrical and Electronics Engineering", "الهندسة الكهربائية والإلكترونية"),
          m("Petroleum Engineering", "هندسة البترول"),
        ],
      },
      {
        ar: "كلية إدارة الأعمال",
        majors: [
          m("Management", "الإدارة"),
          m("Marketing", "التسويق"),
          m("Accounting", "المحاسبة"),
          m("Finance", "المالية"),
        ],
      },
      {
        ar: "كلية الطيران",
        majors: [
          m("Aircraft Maintenance Engineering", "هندسة صيانة الطائرات"),
          m("Aviation and Airport Operations", "الطيران وعمليات المطارات"),
        ],
      },
      { ar: "قسم الملاحة البحرية", majors: [m("Nautical Science", "علوم الملاحة")] },
    ],
  },
  {
    official: "Arab Open University - Kuwait",
    ar: "الجامعة العربية المفتوحة - الكويت",
    en: "Arab Open University - Kuwait",
    type: "private",
    aliases: ["AOU", "Arab Open University"],
    verified: false,
    colleges: [
      {
        ar: "كلية الدراسات التجارية",
        majors: [
          m("Business Studies (Accounting)", "الدراسات التجارية (المحاسبة)"),
          m("Business Studies (Economics)", "الدراسات التجارية (الاقتصاد)"),
          m(
            "Business Studies (Management Information Systems)",
            "الدراسات التجارية (نظم المعلومات الإدارية)",
          ),
          m("Business Studies (Management)", "الدراسات التجارية (الإدارة)"),
          m("Business Studies (Marketing)", "الدراسات التجارية (التسويق)"),
          m("Business Studies (Systems Practice)", "الدراسات التجارية (ممارسة النظم)"),
          m("Law", "القانون"),
        ],
      },
      {
        ar: "كلية الدراسات الحاسوبية",
        majors: [
          m("Information Technology and Computing", "تقنية المعلومات والحوسبة"),
          m("Graphics and Multimedia Design Technology", "تقنية تصميم الجرافيكس والوسائط المتعددة"),
        ],
      },
      {
        ar: "كلية دراسات اللغات",
        majors: [
          m("English Language and Literature", "اللغة الإنجليزية وآدابها"),
          m("Media", "الإعلام"),
        ],
      },
      {
        ar: "كلية التربية",
        majors: [
          m("Education (Intermediate and Secondary)", "التربية (المرحلتان المتوسطة والثانوية)"),
        ],
      },
    ],
  },
  {
    official: "International University of Kuwait",
    ar: "الجامعة الدولية في الكويت",
    en: "International University of Kuwait",
    type: "private",
    aliases: ["IUK"],
    verified: true,
    colleges: [
      {
        ar: "كلية إدارة الأعمال",
        majors: [
          m("Accounting", "المحاسبة"),
          m("Banking Services and Investment Management", "الخدمات المصرفية وإدارة الاستثمار"),
          m("Finance and Financial Technology", "المالية والتقنية المالية"),
          m("Healthcare Management", "إدارة الرعاية الصحية"),
          m("Information Systems", "نظم المعلومات"),
          m("Marketing", "التسويق"),
          m("Supply Chain Management and Logistics", "إدارة سلاسل الإمداد والخدمات اللوجستية"),
        ],
      },
      {
        ar: "كلية الهندسة",
        majors: [
          m("Industrial Engineering", "الهندسة الصناعية"),
          m("Biomedical Engineering", "الهندسة الطبية الحيوية"),
          m("Electrical Engineering", "الهندسة الكهربائية"),
          m("Computer Engineering", "هندسة الحاسوب"),
          m(
            "Computer Science and Cybersecurity Engineering",
            "علوم الحاسوب وهندسة الأمن السيبراني",
          ),
          m("Architectural and Design Engineering", "الهندسة المعمارية والتصميم"),
          m("Civil and Architectural Engineering", "الهندسة المدنية والمعمارية"),
        ],
      },
      {
        ar: "كلية الآداب",
        majors: [
          m("English Language", "اللغة الإنجليزية"),
          m("Communication and Speech Disorders", "اضطرابات التواصل والنطق"),
          m("Journalism and Electronic Publishing", "الصحافة والنشر الإلكتروني"),
          m("Public Relations and Advertising", "العلاقات العامة والإعلان"),
          m("Sociology", "علم الاجتماع"),
          m("Social Services", "الخدمات الاجتماعية"),
        ],
      },
    ],
  },
  {
    official: "Kuwait College of Science and Technology",
    ar: "كلية الكويت للعلوم والتكنولوجيا",
    en: "Kuwait College of Science and Technology",
    type: "private",
    aliases: ["KCST"],
    verified: false,
    colleges: [
      {
        ar: "كلية الهندسة",
        majors: [
          m("Computer Engineering", "هندسة الحاسوب"),
          m("Electronics and Communications Engineering", "هندسة الإلكترونيات والاتصالات"),
        ],
      },
    ],
  },
  {
    official: "Abdullah Al Salem University",
    ar: "جامعة عبدالله السالم",
    en: "Abdullah Al Salem University",
    type: "public",
    aliases: ["AASU"],
    verified: false, // Engineering & Energy majors list is incomplete ("such as …")
    colleges: [
      {
        ar: "كلية النظم وهندسة الحاسوب",
        majors: [
          m("Computer Systems Engineering", "هندسة أنظمة الحاسوب"),
          m("Cybersecurity Engineering", "هندسة الأمن السيبراني"),
          m("Data Science and Artificial Intelligence", "علوم البيانات والذكاء الاصطناعي"),
          m("Software Engineering", "هندسة البرمجيات"),
        ],
      },
      {
        ar: "كلية الهندسة والطاقة",
        majors: [
          m("Biomedical Engineering", "الهندسة الطبية الحيوية"),
          m("Energy Systems Engineering", "هندسة أنظمة الطاقة"),
          m("Environmental Engineering", "الهندسة البيئية"),
          m("Robotics and Mechatronics Engineering", "هندسة الروبوتات والميكاترونكس"),
        ],
      },
      {
        ar: "كلية إدارة وريادة الأعمال",
        majors: [
          m("Digital Marketing", "التسويق الرقمي"),
          m("Entrepreneurship and Innovation", "ريادة الأعمال والابتكار"),
          m("Supply Chain Management", "إدارة سلسلة التوريد"),
        ],
      },
      { ar: "كلية الطب والعلوم الصحية", majors: [m("Medicine (MD)", "الطب (دكتور في الطب)")] },
      { ar: "كلية الدراسات التكاملية", majors: [] },
    ],
  },
  {
    official: "American International University - Kuwait",
    ar: "الجامعة الأمريكية الدولية - الكويت",
    en: "American International University - Kuwait",
    type: "private",
    aliases: ["AIU"],
    verified: true,
    colleges: [
      {
        ar: "كلية إدارة الأعمال",
        majors: [
          m("Entrepreneurship", "ريادة الأعمال"),
          m("Marketing", "التسويق"),
          m("Accounting", "المحاسبة"),
          m("Finance", "المالية"),
          m("Global Supply Chain Management", "إدارة سلاسل الإمداد العالمية"),
          m("Management", "الإدارة"),
        ],
      },
      {
        ar: "كلية العمارة والتصميم",
        majors: [m("Graphic Design", "التصميم الجرافيكي"), m("Interior Design", "التصميم الداخلي")],
      },
      {
        ar: "كلية الهندسة",
        majors: [
          m("Chemical Engineering", "الهندسة الكيميائية"),
          m("Biomedical Engineering", "الهندسة الطبية الحيوية"),
          m("Civil Engineering", "الهندسة المدنية"),
          m("Computer Science", "علوم الحاسوب"),
          m("Electrical and Computer Engineering", "الهندسة الكهربائية وهندسة الحاسوب"),
          m("Industrial Engineering", "الهندسة الصناعية"),
          m("Mechanical Engineering", "الهندسة الميكانيكية"),
        ],
      },
      {
        ar: "كلية التربية",
        majors: [
          m("Education in Science", "التربية في العلوم"),
          m("Secondary Education in English", "التعليم الثانوي في اللغة الإنجليزية"),
          m("Secondary Education in Math", "التعليم الثانوي في الرياضيات"),
          m("Elementary Education in Math", "التعليم الابتدائي في الرياضيات"),
          m("Elementary Education in English", "التعليم الابتدائي في اللغة الإنجليزية"),
        ],
      },
      { ar: "كلية الآداب والعلوم", majors: [m("Biotechnology", "التقنية الحيوية")] },
    ],
  },
  {
    official: "Kuwait Maastricht Business School",
    ar: "كلية كويت ماسترخت لإدارة الأعمال",
    en: "Kuwait Maastricht Business School",
    type: "private",
    aliases: ["KMBS", "Kuwait Maastricht College of Management"],
    verified: true, // postgraduate only
    colleges: [
      {
        ar: "كلية كويت ماسترخت لإدارة الأعمال",
        majors: [
          m("MBA Program", "ماجستير إدارة الأعمال (MBA)"),
          m("MM Program", "ماجستير الإدارة العامة (MM)"),
        ],
      },
    ],
  },
];

/** Sentinel select value for a university / college / major that is not in the catalog. */
export const OTHER_UNIVERSITY = "__other__";
export const OTHER_OPTION = "__other__";

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
 * Colleges offered for a university (Level 2 of the cascade). A custom or not-yet-detailed
 * university gets the generic list so the student is never blocked.
 */
export function collegesForUniversity(stored: string | null | undefined): College[] {
  const u = findUniversity(stored);
  if (!u || u.colleges.length === 0) return COLLEGES.filter((c) => c.ar !== "أخرى");
  const names = u.colleges.map((c) => c.ar);
  return names
    .map((ar) => COLLEGES.find((c) => c.ar === ar))
    .filter((c): c is College => Boolean(c));
}

/** Majors offered by a college of a university (Level 3 of the cascade). Empty = type it manually. */
export function majorsForCollege(
  university: string | null | undefined,
  collegeAr: string | null | undefined,
): Major[] {
  const u = findUniversity(university);
  return u?.colleges.find((c) => c.ar === (collegeAr ?? "").trim())?.majors ?? [];
}

export function majorLabel(
  university: string | null | undefined,
  collegeAr: string | null | undefined,
  stored: string | null | undefined,
  lang: "ar" | "en",
): string {
  const hit = majorsForCollege(university, collegeAr).find((x) => norm(x.en) === norm(stored));
  return hit ? hit[lang] : (stored ?? "").trim();
}
