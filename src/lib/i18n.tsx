import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  appName: { ar: "غالِـب", en: "Ghalib" },
  tagline: {
    ar: "مساعدك الأكاديمي الذكي",
    en: "Your AI academic assistant",
  },
  heroTitle: {
    ar: "ارفع الخطة الدراسية… ودع الذكاء الاصطناعي يبني فصلك الدراسي",
    en: "Upload your syllabus. Let AI build your semester.",
  },
  heroBody: {
    ar: "منصة واحدة لكل موادك: جدول المحاضرات، مواعيد الاختبارات، قائمة الواجبات، وتوزيع الدرجات — تُستخرج تلقائياً من ملف الخطة الدراسية.",
    en: "One place for every course: class schedule, exam dates, assignment checklist, and grade weights — extracted automatically from your syllabus file.",
  },
  getStarted: { ar: "ابدأ مجاناً", en: "Get started" },
  signIn: { ar: "تسجيل الدخول", en: "Sign in" },
  signUp: { ar: "إنشاء حساب", en: "Create account" },
  signOut: { ar: "تسجيل الخروج", en: "Sign out" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  fullName: { ar: "الاسم الكامل", en: "Full name" },
  continueGoogle: { ar: "المتابعة عبر Google", en: "Continue with Google" },
  or: { ar: "أو", en: "or" },
  dashboard: { ar: "اللوحة الرئيسية", en: "Dashboard" },
  profile: { ar: "الملف الأكاديمي", en: "Academic profile" },
  courses: { ar: "المواد", en: "Courses" },
  addCourse: { ar: "إضافة مادة", en: "Add course" },
  searchCourses: { ar: "ابحث عن مادة…", en: "Search courses…" },
  current: { ar: "أدرسها حالياً", en: "Currently studying" },
  completed: { ar: "مكتملة", en: "Completed" },
  future: { ar: "خطة مستقبلية", en: "Future plan" },
  major: { ar: "التخصص", en: "Major" },
  currentTerm: { ar: "الفصل الحالي", en: "Current term" },
  totalCredits: { ar: "الساعات المكتملة", en: "Completed credits" },
  overallGpa: { ar: "المعدل التراكمي", en: "Overall GPA" },
  semesterGpa: { ar: "معدل الفصل", en: "Semester GPA" },
  save: { ar: "حفظ", en: "Save" },
  saved: { ar: "تم الحفظ", en: "Saved" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  courseName: { ar: "اسم المادة", en: "Course name" },
  courseCode: { ar: "رمز المادة", en: "Course code" },
  instructor: { ar: "المدرّس", en: "Instructor" },
  location: { ar: "القاعة / المبنى", en: "Room / building" },
  term: { ar: "الفصل", en: "Term" },
  credits: { ar: "الساعات", en: "Credits" },
  status: { ar: "التصنيف", en: "Classification" },
  create: { ar: "إنشاء", en: "Create" },
  syllabus: { ar: "الخطة الدراسية", en: "Syllabus" },
  uploadSyllabus: { ar: "رفع الخطة الدراسية (PDF أو صورة)", en: "Upload syllabus (PDF or image)" },
  analyzing: { ar: "جارٍ التحليل بالذكاء الاصطناعي…", en: "Analyzing with AI…" },
  reviewExtraction: { ar: "مراجعة البيانات المستخرجة", en: "Review extracted data" },
  reviewHint: {
    ar: "راجع ما استخرجه الذكاء الاصطناعي قبل الحفظ. يمكنك تعديل أي حقل.",
    en: "Review what the AI extracted before saving. Every field is editable.",
  },
  applyExtraction: { ar: "اعتماد وحفظ", en: "Approve & save" },
  gapsTitle: { ar: "أسئلة سريعة لإكمال الناقص", en: "Quick questions to fill the gaps" },
  gapsHint: {
    ar: "لم يتمكن الذكاء الاصطناعي من العثور على هذه المعلومات في الملف.",
    en: "The AI could not find this information in the document.",
  },
  finish: { ar: "إنهاء", en: "Finish" },
  skip: { ar: "تخطي", en: "Skip" },
  checklist: { ar: "قائمة المهام", en: "Checklist" },
  timeline: { ar: "التقويم الزمني", en: "Timeline" },
  gradeWeights: { ar: "توزيع الدرجات", en: "Grade weights" },
  logistics: { ar: "معلومات المادة", en: "Class logistics" },
  notes: { ar: "ملاحظات", en: "Notes" },
  addTask: { ar: "إضافة مهمة", en: "Add task" },
  title: { ar: "العنوان", en: "Title" },
  dueDate: { ar: "تاريخ التسليم", en: "Due date" },
  weight: { ar: "الوزن %", en: "Weight %" },
  type: { ar: "النوع", en: "Type" },
  assignment: { ar: "واجب", en: "Assignment" },
  exam: { ar: "اختبار", en: "Exam" },
  quiz: { ar: "كويز", en: "Quiz" },
  project: { ar: "مشروع", en: "Project" },
  other: { ar: "أخرى", en: "Other" },
  markCompleted: { ar: "وضع كمكتملة", en: "Mark as completed" },
  finalGrade: { ar: "الدرجة النهائية", en: "Final grade" },
  retake: { ar: "إعادة المادة", en: "Retake" },
  retakeConfirm: {
    ar: "سيتم أرشفة المحاولة الحالية للقراءة فقط وإنشاء نسخة جديدة من المادة في الفصل الحالي.",
    en: "The current attempt will be archived as read-only and a new course instance will be created in the current term.",
  },
  retakeBadge: { ar: "إعادة", en: "Retake" },
  archived: { ar: "مؤرشفة", en: "Archived" },
  viewPrevious: { ar: "عرض المحاولة السابقة", en: "View previous attempt" },
  deleteCourse: { ar: "حذف المادة", en: "Delete course" },
  noCourses: { ar: "لا توجد مواد بعد", en: "No courses yet" },
  addFirstCourse: { ar: "أضف أول مادة لك للبدء.", en: "Add your first course to get started." },
  upcoming: { ar: "القادم قريباً", en: "Coming up" },
  nothingUpcoming: { ar: "لا توجد مواعيد قادمة", en: "Nothing upcoming" },
  meetings: { ar: "مواعيد المحاضرات", en: "Class meetings" },
  overallProgress: { ar: "نسبة الإنجاز", en: "Progress" },
  langSwitch: { ar: "English", en: "العربية" },
  saveFailed: { ar: "تعذّر الحفظ", en: "Could not save" },
  aiFailed: { ar: "تعذّر تحليل الملف", en: "Could not analyze the file" },
  aiRateLimit: { ar: "تم تجاوز حد الطلبات، حاول بعد قليل.", en: "Rate limit reached, try again shortly." },
  aiCredits: { ar: "نفدت أرصدة الذكاء الاصطناعي.", en: "AI credits exhausted." },
  none: { ar: "غير محدد", en: "Not set" },
  taskDone: { ar: "مكتمل", en: "Done" },
  featuresTitle: { ar: "كل ما يحتاجه الطالب في مكان واحد", en: "Everything a student needs, in one place" },
  f1t: { ar: "استخراج ذكي", en: "AI extraction" },
  f1b: {
    ar: "ارفع ملف الخطة الدراسية فيستخرج النظام المواعيد والاختبارات والواجبات وتوزيع الدرجات.",
    en: "Upload the syllabus and the system pulls out schedule, exams, assignments and grade weights.",
  },
  f2t: { ar: "أسئلة تكمّل الناقص", en: "Gap-filling Q&A" },
  f2b: {
    ar: "أسئلة قصيرة ومحددة عمّا لم يُعثر عليه فقط — بدون إعادة إدخال كل شيء.",
    en: "Short, targeted questions for missing fields only — never a full re-entry form.",
  },
  f3t: { ar: "تصنيف ثلاثي وإعادة المواد", en: "Three tabs & retakes" },
  f3b: {
    ar: "أدرسها حالياً، مكتملة، خطة مستقبلية — مع أرشفة كاملة لكل محاولة عند إعادة المادة.",
    en: "Currently studying, completed, future plan — with full archiving of each attempt on retake.",
  },
  f4t: { ar: "لوحة لكل مادة", en: "Per-course dashboard" },
  f4b: {
    ar: "قائمة مهام، تقويم زمني، توزيع درجات، وملاحظات — تُبنى تلقائياً.",
    en: "Checklist, timeline, grade weights and notes — generated automatically.",
  },
  loading: { ar: "جارٍ التحميل…", en: "Loading…" },
} as const;

export type TKey = keyof typeof dict;

type Ctx = { lang: Lang; dir: "rtl" | "ltr"; t: (k: TKey) => string; setLang: (l: Lang) => void };

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const stored = window.localStorage.getItem("lang");
    if (stored === "en" || stored === "ar") setLangState(stored);
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("lang", l);
  }, []);

  const t = useCallback((k: TKey) => dict[k][lang], [lang]);

  return (
    <LanguageContext.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
