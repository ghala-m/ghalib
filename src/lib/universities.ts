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
export type UniversityCollege = { ar: string; en?: string; majors: Major[] };
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
          m("French Language and Cultures", "اللغة الفرنسية وثقافاتها"),
          m("History", "التاريخ"),
          m("Philosophy", "الفلسفة"),
          m("Comparative Literary and Cultural Studies", "الدراسات الأدبية والثقافية المقارنة"),
          m(
            "Mass Communication",
            "الإعلام (الصحافة، الإذاعة والتلفزيون، العلاقات العامة والاتصال الرقمي)",
          ),
        ],
      },
      {
        ar: "كلية العلوم",
        majors: [
          m("Data Science and Artificial Intelligence", "علوم البيانات والذكاء الاصطناعي"),
          m("Cybersecurity", "الأمن السيبراني"),
          m("Computer Science", "علوم الحاسوب"),
          m("Chemistry", "الكيمياء"),
          m("Applied Chemistry", "الكيمياء التطبيقية"),
          m("Physics", "الفيزياء"),
          m("Engineering Physics", "الفيزياء الهندسية"),
          m("Mathematics", "الرياضيات"),
          m("Financial Mathematics", "الرياضيات المالية"),
          m("Statistics", "الإحصاء"),
          m("Statistics and Operations Research", "الإحصاء وبحوث العمليات"),
          m("Geology", "الجيولوجيا (علوم الأرض)"),
          m("Geophysics", "الجيوفيزياء"),
          m("Biological Sciences", "العلوم البيولوجية"),
          m("Biochemistry", "الكيمياء الحيوية"),
          m("Marine Science", "علوم البحار"),
          m("Human Biology", "علم الأحياء البشري"),
        ],
      },
      {
        ar: "كلية الهندسة والبترول",
        majors: [
          m("Civil Engineering", "الهندسة المدنية"),
          m("Mechanical Engineering", "الهندسة الميكانيكية"),
          m("Electrical Engineering", "الهندسة الكهربائية"),
          m("Chemical Engineering", "الهندسة الكيميائية"),
          m("Petroleum Engineering", "هندسة البترول"),
          m("Industrial and Management Engineering", "الهندسة الصناعية والإدارية"),
          m("Computer Engineering", "هندسة الكمبيوتر"),
        ],
      },
      {
        ar: "كلية العلوم الإدارية",
        majors: [
          m("Accounting", "المحاسبة"),
          m("Finance and Financial Institutions", "التمويل والمنشآت المالية"),
          m("Marketing", "التسويق"),
          m("Management", "الإدارة"),
          m("Management Information Systems (MIS)", "نظم المعلومات الإدارية"),
          m("Economics", "الاقتصاد"),
          m("Public Administration", "الإدارة العامة"),
          m("Quantitative Methods and Information Systems", "الأساليب الكمية ونظم المعلومات"),
        ],
      },
      {
        ar: "كلية علوم الحياة",
        majors: [
          m("Environmental Technology Management", "إدارة التقنية البيئية"),
          m("Food Science and Human Nutrition", "علم الغذاء وتغذية الإنسان"),
          m("Communication Disorders", "اضطرابات التواصل"),
        ],
      },
      {
        ar: "كلية العلوم الاجتماعية",
        majors: [
          m("Geography (GIS)", "الجغرافيا (نظم المعلومات الجغرافية)"),
          m("Information Studies", "دراسات المعلومات"),
          m("Political Science", "العلوم السياسية"),
          m("Psychology", "علم النفس"),
          m("Sociology and Social Work", "علم الاجتماع والخدمة الاجتماعية"),
        ],
      },
      {
        ar: "كلية التربية",
        majors: [
          m("Kindergarten", "رياض الأطفال"),
          m(
            "Elementary (Arts track)",
            "الابتدائية - المسار الأدبي (عربي، إنجليزي، دراسات إسلامية، دراسات اجتماعية)",
          ),
          m("Elementary (Science track)", "الابتدائية - المسار العلمي (رياضيات، علوم)"),
          m(
            "Middle and Secondary (Sciences)",
            "المتوسط والثانوي - علمي (رياضيات، كيمياء، فيزياء، أحياء، جيولوجيا، حاسوب)",
          ),
          m(
            "Middle and Secondary (Arts)",
            "المتوسط والثانوي - أدبي (عربي، إنجليزي، تاريخ، جغرافيا، علم نفس، فلسفة، دراسات إسلامية)",
          ),
        ],
      },
      {
        ar: "كلية العلوم الطبية المساندة",
        majors: [
          m("Biomedical Science Technology", "تكنولوجيا العلوم الطبية الحيوية"),
          m("Radiologic Sciences", "علوم الأشعة"),
          m("Physical Therapy", "العلاج الطبيعي"),
          m("Occupational Therapy", "العلاج المهني"),
          m("Health Information Management", "إدارة المعلومات الصحية"),
        ],
      },
      {
        ar: "كلية الصحة العامة",
        majors: [m("Public Health Practice", "ممارسة الصحة العامة")],
      },
      { ar: "كلية الطب", majors: [m("Medicine", "الطب البشري")] },
      { ar: "كلية الصيدلة", majors: [m("Pharmacy (PharmD)", "الصيدلة (دكتور صيدلة)")] },
      { ar: "كلية طب الأسنان", majors: [m("Dentistry", "طب الأسنان")] },
      {
        ar: "كلية الحقوق",
        majors: [m("Law", "القانون (برنامج موحد)")],
      },
      {
        ar: "كلية العمارة",
        majors: [
          m("Architecture", "العمارة"),
          m("Landscape Architecture", "عمارة البيئة"),
          m("Visual and Interior Design", "التصميم المرئي والداخلي"),
        ],
      },
      {
        ar: "كلية الشريعة",
        majors: [
          m("Creed and Dawah", "العقيدة والدعوة"),
          m("Tafsir and Hadith", "التفسير والحديث"),
          m("Fiqh and Usul Al-Fiqh", "الفقه وأصوله"),
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
    verified: true,
    colleges: [
      {
        ar: "كلية إدارة الأعمال",
        majors: [
          m("Accounting", "المحاسبة"),
          m("Finance", "التمويل والمنشآت المالية"),
          m("Management Information Systems", "إدارة نظم المعلومات"),
          m("International Business", "إدارة الأعمال الدولية"),
          m("Marketing", "التسويق"),
        ],
      },
      {
        ar: "كلية الآداب والعلوم",
        majors: [
          m("English (Literature)", "اللغة الإنجليزية (الأدب)"),
          m("English (Translation and Linguistics)", "اللغة الإنجليزية (الترجمة واللغويات)"),
          m("Mass Communication (Radio and Television)", "الإعلام (الراديو والتلفزيون)"),
          m(
            "Mass Communication (Public Relations and Communication)",
            "الإعلام (العلاقات العامة والاتصال)",
          ),
          m("Mass Communication (Visual Communication)", "الإعلام (الاتصال المرئي)"),
          m("Computer Science", "علوم الحاسوب"),
        ],
      },
      {
        ar: "كلية الهندسة والعمارة",
        majors: [m("Computer Engineering", "هندسة الحاسوب")],
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
        ar: "كلية العلوم والفنون",
        majors: [
          m("Design (Graphic Design)", "التصميم (مسار التصميم الجرافيكي)"),
          m("Media and Communication Studies", "الإعلام والدراسات الإعلامية"),
          m("English Language and Literature", "اللغة الإنجليزية وآدابها"),
          m("International Relations", "العلاقات الدولية"),
          m(
            "Social and Behavioral Sciences (Anthropology)",
            "العلوم الاجتماعية والسلوكية (مسار الأنثروبولوجيا)",
          ),
        ],
      },
      {
        ar: "كلية الهندسة والعلوم التطبيقية",
        majors: [
          m("Computer Engineering", "هندسة الكمبيوتر"),
          m("Electrical Engineering", "الهندسة الكهربائية"),
          m("Systems Engineering", "هندسة الأنظمة"),
          m("Computer Science", "علوم الكمبيوتر"),
          m("Information Systems", "نظم المعلومات"),
        ],
      },
      {
        ar: "كلية الإدارة والاقتصاد",
        majors: [
          m("Accounting", "المحاسبة"),
          m("Finance", "التمويل"),
          m("Management", "الإدارة"),
          m("Marketing", "التسويق"),
          m("Economics", "الاقتصاد"),
          m("Human Resource Management", "إدارة الموارد البشرية"),
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
        ar: "كلية الهندسة والتكنولوجيا",
        majors: [
          m("Civil Engineering", "الهندسة المدنية"),
          m("Mechanical Engineering", "الهندسة الميكانيكية"),
          m("Electrical Engineering", "الهندسة الكهربائية"),
          m("Chemical Engineering", "الهندسة الكيميائية"),
          m("Industrial Engineering", "الهندسة الصناعية"),
          m("Computer Engineering", "هندسة الكمبيوتر"),
          m("Architectural Engineering", "الهندسة المعمارية"),
          m(
            "Information Systems and Technology / Telecommunications and Networking",
            "نظم وتكنولوجيا المعلومات / تكنولوجيا الاتصالات والشبكات",
          ),
        ],
      },
      {
        ar: "كلية إدارة الأعمال",
        majors: [
          m("Accounting", "المحاسبة"),
          m("Finance", "التمويل"),
          m("Human Resource Management", "إدارة الموارد البشرية"),
          m("Marketing", "التسويق"),
          m("Management Information Systems (MIS)", "نظم المعلومات الإدارية (MIS)"),
        ],
      },
    ],
  },
  {
    official: "Arab Open University - Kuwait",
    ar: "الجامعة العربية المفتوحة - الكويت",
    en: "Arab Open University - Kuwait",
    type: "private",
    aliases: ["AOU", "Arab Open University"],
    verified: true,
    colleges: [
      {
        ar: "كلية الدراسات التجارية",
        majors: [
          m("Management (Systems Practice)", "الإدارة / النظم الإدارية"),
          m("Marketing", "التسويق"),
          m("Accounting", "المحاسبة"),
          m("Economics", "الاقتصاد"),
          m("Management Information Systems", "نظم المعلومات الإدارية"),
        ],
      },
      {
        ar: "كلية الدراسات الحاسوبية",
        majors: [
          m("IT and Computing (Computer Science)", "تقنية المعلومات والحوسبة (علوم الكمبيوتر)"),
          m(
            "IT and Computing (Computing with Business)",
            "تقنية المعلومات والحوسبة (الحوسبة مع الأعمال)",
          ),
          m(
            "IT and Computing (Networking and Data Security)",
            "تقنية المعلومات والحوسبة (الشبكات وأمن البيانات)",
          ),
          m("IT and Computing (Web Development)", "تقنية المعلومات والحوسبة (تطوير حلول الويب)"),
        ],
      },
      {
        ar: "كلية دراسات اللغات",
        majors: [m("English Language and Literature", "اللغة الإنجليزية وآدابها")],
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
    verified: true,
    colleges: [
      {
        ar: "كلية الهندسة والتكنولوجيا",
        majors: [
          m("Computer Engineering", "هندسة الحاسوب"),
          m("Electronics and Communications Engineering", "هندسة الإلكترونيات والاتصالات"),
          m("Computer Science", "علوم الكمبيوتر"),
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
    verified: true,
    colleges: [
      {
        ar: "كلية هندسة الحاسوب والنظم",
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
          m("Biomedical Engineering and Microsystems", "الهندسة الطبية الحيوية والآلات الدقيقة"),
          m("Agricultural and Bioresource Engineering", "الهندسة الزراعية والموارد الحيوية"),
          m("Energy Systems Engineering", "هندسة أنظمة الطاقة"),
          m("Environmental Engineering and Sustainability", "الهندسة البيئية والاستدامة"),
          m("Materials Science and Engineering", "هندسة وعلوم المواد"),
          m("Robotics and Mechatronics Engineering", "هندسة الروبوتات والميكاترونكس"),
        ],
      },
      {
        ar: "كلية إدارة وريادة الأعمال",
        majors: [
          m("Digital Marketing", "التسويق الرقمي"),
          m("Entrepreneurship and Innovation", "ريادة الأعمال والابتكار"),
          m("Supply Chain and Logistics Management", "إدارة سلسلة التوريد والخدمات اللوجستية"),
        ],
      },
      {
        ar: "كلية الطب والعلوم الصحية",
        majors: [m("Medicine (MD)", "الطب (دكتور في الطب)")],
      },
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

/**
 * Lookup helpers. They take the catalog as an optional last/first argument: the app passes the live
 * catalog loaded from the database (see useCatalog), while tests and the first paint fall back to
 * the bundled UNIVERSITIES list below.
 */
export function findUniversity(
  stored: string | null | undefined,
  list: University[] = UNIVERSITIES,
): University | undefined {
  const v = norm(stored);
  if (!v) return undefined;
  return list.find((u) =>
    [u.official, u.ar, u.en, ...(u.aliases ?? [])].some((n) => norm(n) === v),
  );
}

export function universityLabel(
  stored: string | null | undefined,
  lang: "ar" | "en",
  list: University[] = UNIVERSITIES,
): string {
  const u = findUniversity(stored, list);
  return u ? u[lang] : (stored ?? "").trim();
}

/**
 * Colleges offered for a university (Level 2 of the cascade). A custom or not-yet-detailed
 * university gets the generic list so the student is never blocked. A college that exists in the
 * catalog but not in COLLEGES (added by an admin) is shown with the shared theme styling.
 */
export function collegesForUniversity(
  stored: string | null | undefined,
  list: University[] = UNIVERSITIES,
): College[] {
  const u = findUniversity(stored, list);
  if (!u || u.colleges.length === 0) return COLLEGES.filter((c) => c.ar !== "أخرى");
  return u.colleges.map(
    (c) =>
      COLLEGES.find((x) => x.ar === c.ar) ?? {
        ar: c.ar,
        en: c.en ?? c.ar,
        chip: COLLEGES[0]!.chip,
        dot: COLLEGES[0]!.dot,
      },
  );
}

/** Majors offered by a college of a university (Level 3 of the cascade). Empty = type it manually. */
export function majorsForCollege(
  university: string | null | undefined,
  collegeAr: string | null | undefined,
  list: University[] = UNIVERSITIES,
): Major[] {
  const u = findUniversity(university, list);
  return u?.colleges.find((c) => c.ar === (collegeAr ?? "").trim())?.majors ?? [];
}

export function majorLabel(
  university: string | null | undefined,
  collegeAr: string | null | undefined,
  stored: string | null | undefined,
  lang: "ar" | "en",
  list: University[] = UNIVERSITIES,
): string {
  const hit = majorsForCollege(university, collegeAr, list).find(
    (x) => norm(x.en) === norm(stored),
  );
  return hit ? hit[lang] : (stored ?? "").trim();
}
