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
  // --- Navigation & shell ---
  calendar: { ar: "التقويم", en: "Calendar" },
  advisor: { ar: "المرشد الذكي", en: "AI advisor" },
  studyPlan: { ar: "الخطة الدراسية", en: "Study plan" },
  appearance: { ar: "المظهر", en: "Appearance" },
  settings: { ar: "الإعدادات", en: "Settings" },
  // --- Theme ---
  themeLight: { ar: "فاتح", en: "Light" },
  themeDark: { ar: "داكن", en: "Dark" },
  themeSystem: { ar: "النظام", en: "System" },
  accentColor: { ar: "لون الواجهة", en: "Accent colour" },
  accentHint: { ar: "اختر اللون الذي يناسبك، ويُطبَّق على الموقع كاملاً.", en: "Pick the colour that suits you; it applies across the whole app." },
  // --- Categories ---
  categories: { ar: "أقسام المواد", en: "Course categories" },
  category: { ar: "القسم", en: "Category" },
  general: { ar: "مواد عامة", en: "General requirements" },
  college: { ar: "مواد كلية", en: "College requirements" },
  majorReq: { ar: "مواد تخصص", en: "Major requirements" },
  major_elective: { ar: "مواد تخصص اختيارية", en: "Major electives" },
  // --- Files ---
  onlyPdfWord: { ar: "يُقبل ملف PDF أو Word فقط", en: "PDF or Word files only" },
  invalidFile: { ar: "نوع الملف غير مدعوم. ارفع ملف PDF أو Word.", en: "Unsupported file type. Upload a PDF or Word file." },
  readFailed: { ar: "تعذّرت قراءة الملف", en: "Could not read the file" },
  // --- Onboarding ---
  onboarding: { ar: "الإعداد الأولي", en: "Getting started" },
  onboardingTitle: { ar: "لنبدأ بخطتك الدراسية", en: "Let's start with your study plan" },
  onboardingBody: {
    ar: "ارفع الميجر شيت (الخطة الدراسية للتخصص) بصيغة PDF أو Word، وسيقرأها الذكاء الاصطناعي ويستخرج كل المواد ومسبقاتها وأقسامها.",
    en: "Upload your major sheet (degree plan) as PDF or Word and the AI will read every course, its prerequisites and its category.",
  },
  uploadMajorSheet: { ar: "رفع الميجر شيت", en: "Upload major sheet" },
  step: { ar: "خطوة", en: "Step" },
  stepPlan: { ar: "الخطة الدراسية", en: "Study plan" },
  stepProgress: { ar: "ما أنجزته", en: "Your progress" },
  stepDone: { ar: "جاهز", en: "Ready" },
  reviewPlanTitle: { ar: "راجع المواد المستخرجة", en: "Review the extracted courses" },
  reviewPlanHint: { ar: "عدّل القسم أو الساعات عند الحاجة قبل الحفظ.", en: "Adjust category or credits if needed before saving." },
  markProgressTitle: { ar: "أي مواد أنهيتها؟", en: "Which courses have you completed?" },
  markProgressHint: {
    ar: "اختر المواد التي أنهيتها وأدخل تقديرك والفصل الذي أنهيتها فيه. باقي المواد ستُصنّف كخطة مستقبلية.",
    en: "Select the courses you finished and add your grade and the term. The rest stay as future plan.",
  },
  markCurrentTitle: { ar: "وأي مواد تدرسها الآن؟", en: "And which are you studying now?" },
  grade: { ar: "التقدير", en: "Grade" },
  gradePoints: { ar: "النقاط", en: "Points" },
  completedTerm: { ar: "فصل الإنجاز", en: "Term completed" },
  finishSetup: { ar: "إنهاء الإعداد", en: "Finish setup" },
  planSaved: { ar: "تم حفظ خطتك الدراسية", en: "Your study plan is saved" },
  coursesFound: { ar: "مادة تم التعرف عليها", en: "courses detected" },
  redoOnboarding: { ar: "إعادة رفع الميجر شيت", en: "Re-upload major sheet" },
  university: { ar: "الجامعة", en: "University" },
  // --- Flow chart ---
  flowChart: { ar: "مخطط المسبقات", en: "Prerequisite map" },
  flowChartHint: {
    ar: "الأسهم تشير من المادة المسبقة إلى المادة التي تفتحها.",
    en: "Arrows point from a prerequisite to the course it unlocks.",
  },
  unlocks: { ar: "تفتح", en: "Unlocks" },
  prerequisites: { ar: "المسبقات", en: "Prerequisites" },
  available: { ar: "متاحة الآن", en: "Available now" },
  locked: { ar: "مقفلة", en: "Locked" },
  noPlanYet: { ar: "لا توجد خطة دراسية بعد", en: "No study plan yet" },
  level: { ar: "المستوى", en: "Level" },
  // --- Calendar ---
  day: { ar: "يومي", en: "Day" },
  week: { ar: "أسبوعي", en: "Week" },
  month: { ar: "شهري", en: "Month" },
  today: { ar: "اليوم", en: "Today" },
  noEvents: { ar: "لا توجد أحداث", en: "No events" },
  classSession: { ar: "محاضرة", en: "Class" },
  // --- Advisor ---
  advisorTitle: { ar: "اسأل غالِـب", en: "Ask Ghalib" },
  advisorHint: {
    ar: "مرشدك الذكي: خطط لمذاكرتك، لخّص المنهج، جهّز جدول مراجعة، أو اسأل عن أي مادة.",
    en: "Your AI advisor: plan your study, summarise material, build a revision schedule, or ask about any course.",
  },
  askPlaceholder: { ar: "اكتب سؤالك…", en: "Type your question…" },
  send: { ar: "إرسال", en: "Send" },
  clearChat: { ar: "مسح المحادثة", en: "Clear chat" },
  thinking: { ar: "يفكر…", en: "Thinking…" },
  suggestion1: { ar: "ابنِ لي خطة مذاكرة لهذا الأسبوع", en: "Build me a study plan for this week" },
  suggestion2: { ar: "ما المواد التي يجب أن أسجلها الفصل القادم؟", en: "Which courses should I register next term?" },
  suggestion3: { ar: "كيف أرفع معدلي التراكمي؟", en: "How can I raise my GPA?" },
  // --- Misc ---
  quickActions: { ar: "إجراءات سريعة", en: "Quick actions" },
  progress: { ar: "التقدّم", en: "Progress" },
  creditsDone: { ar: "ساعة مكتملة", en: "credits completed" },
  overview: { ar: "نظرة عامة", en: "Overview" },
  tools: { ar: "أدوات الدراسة", en: "Study tools" },
  studyToolsHint: { ar: "أدوات ذكاء اصطناعي تساعدك في المذاكرة والبحث.", en: "AI tools that help you study and research." },
  openTool: { ar: "فتح", en: "Open" },
  backToDashboard: { ar: "العودة للوحة", en: "Back to dashboard" },
  loading: { ar: "جارٍ التحميل…", en: "Loading…" },
  // --- Editing & flexibility ---
  edit: { ar: "تعديل", en: "Edit" },
  editCourse: { ar: "تعديل المادة", en: "Edit course" },
  delete: { ar: "حذف", en: "Delete" },
  deleteConfirm: { ar: "هل تريد حذف هذه المادة نهائياً؟ سيتم حذف مهامها ودرجاتها.", en: "Delete this course permanently? Its tasks and weights will be removed too." },
  deleted: { ar: "تم الحذف", en: "Deleted" },
  nickname: { ar: "الاسم المختصر", en: "Nickname" },
  nicknameHint: { ar: "الاختصار الذي تستخدمه بين الطلبة — يظهر في البحث.", en: "The short name students use — it works in search too." },
  altGroup: { ar: "مجموعة البدائل", en: "Alternatives group" },
  altGroupHint: {
    ar: "المواد التي تحمل نفس اسم المجموعة تعتبر بدائل: إذا أكملت واحدة تُشطَب البقية.",
    en: "Courses sharing a group name are alternatives: complete one and the rest are struck through.",
  },
  blockedByAlt: { ar: "غير متاحة — أخذت بديلها", en: "Unavailable — you took its alternative" },
  changeStatus: { ar: "تغيير التصنيف", en: "Change classification" },
  statusUpdated: { ar: "تم تحديث التصنيف", en: "Classification updated" },
  // --- Course items ---
  addItem: { ar: "إضافة مهمة/اختبار", en: "Add task or exam" },
  editItem: { ar: "تعديل المهمة", en: "Edit task" },
  dueTime: { ar: "الوقت", en: "Time" },
  description: { ar: "الوصف", en: "Description" },
  courseCalendar: { ar: "تقويم المادة", en: "Course calendar" },
  courseCalendarHint: { ar: "كل ما يخص هذه المادة فقط — يومي وأسبوعي وشهري.", en: "Only this course — day, week and month views." },
  // --- Events & reminders ---
  addEvent: { ar: "إضافة حدث", en: "Add event" },
  editEvent: { ar: "تعديل الحدث", en: "Edit event" },
  eventTitle: { ar: "عنوان الحدث", en: "Event title" },
  eventDate: { ar: "التاريخ", en: "Date" },
  eventTime: { ar: "الوقت", en: "Time" },
  reminder: { ar: "التنبيه", en: "Reminder" },
  noReminder: { ar: "بدون تنبيه", en: "No reminder" },
  remind10: { ar: "قبل ١٠ دقائق", en: "10 minutes before" },
  remind30: { ar: "قبل ٣٠ دقيقة", en: "30 minutes before" },
  remind60: { ar: "قبل ساعة", en: "1 hour before" },
  remind1440: { ar: "قبل يوم", en: "1 day before" },
  enableNotifications: { ar: "تفعيل التنبيهات", en: "Enable notifications" },
  notificationsOn: { ar: "التنبيهات مفعّلة", en: "Notifications enabled" },
  notificationsBlocked: { ar: "التنبيهات محظورة من المتصفح", en: "Notifications are blocked by the browser" },
  linkedCourse: { ar: "المادة المرتبطة", en: "Linked course" },
  noCourseLink: { ar: "بدون مادة", en: "No course" },
  // --- Terms ---
  terms: { ar: "الفصول الدراسية", en: "Terms" },
  startTerm: { ar: "بدء فصل جديد", en: "Start a new term" },
  endTerm: { ar: "إنهاء الفصل", en: "End this term" },
  termName: { ar: "اسم الفصل", en: "Term name" },
  termNumber: { ar: "رقم الفصل", en: "Term number" },
  startDate: { ar: "تاريخ البداية", en: "Start date" },
  endDate: { ar: "تاريخ النهاية", en: "End date" },
  termGpa: { ar: "معدل الفصل", en: "Term GPA" },
  activeTerm: { ar: "الفصل النشط", en: "Active term" },
  noActiveTerm: { ar: "لا يوجد فصل نشط", en: "No active term" },
  endTermHint: {
    ar: "عند إنهاء الفصل تُنقل موادك الحالية إلى «مكتملة»، ويُسجَّل معدلك، وتُرحَّل إلى الفصل التالي.",
    en: "Ending a term moves your current courses to “completed”, records your GPA and advances you to the next term.",
  },
  startTermHint: { ar: "سجّل بيانات الفصل الجديد واختر المواد التي ستدرسها فيه.", en: "Record the new term and pick the courses you will study in it." },
  selectCourses: { ar: "اختر المواد", en: "Select courses" },
  termStarted: { ar: "بدأ الفصل الجديد", en: "New term started" },
  termEnded: { ar: "تم إنهاء الفصل", en: "Term closed" },
  history: { ar: "السجل", en: "History" },
  // --- Advisor / profile redesign ---
  aiChatFailed: { ar: "تعذّر الرد من المرشد، حاول مرة أخرى.", en: "The advisor could not reply, please try again." },
  advisorSidebarTitle: { ar: "سياق المحادثة", en: "Conversation context" },
  advisorContextHint: { ar: "غالِـب يرى هذه المعلومات عند الإجابة.", en: "Ghalib sees this information when answering." },
  newChat: { ar: "محادثة جديدة", en: "New chat" },
  academicSummary: { ar: "الملخص الأكاديمي", en: "Academic summary" },
  personalInfo: { ar: "المعلومات الشخصية", en: "Personal info" },
  gpaBreakdown: { ar: "توزيع المعدل", en: "GPA breakdown" },
  byCategory: { ar: "حسب القسم", en: "By category" },
  completionRate: { ar: "نسبة إتمام الخطة", en: "Plan completion" },
  coursesCount: { ar: "عدد المواد", en: "Courses" },
  recalcGpa: { ar: "احسب المعدل من الدرجات", en: "Recalculate GPA from grades" },
  gpaRecalculated: { ar: "تم تحديث المعدل", en: "GPA updated" },
  // --- Study tools ---
  studyTools: { ar: "أدوات الدراسة", en: "Study tools" },
  toolSummarize: { ar: "ملخّص سريع", en: "Quick summary" },
  toolSummarizeBody: { ar: "الصق نصاً أو ارفع ملفاً واحصل على ملخص منظّم بنقاط.", en: "Paste text or upload a file and get a structured bullet summary." },
  toolFlashcards: { ar: "بطاقات مراجعة", en: "Flashcards" },
  toolFlashcardsBody: { ar: "حوّل مادتك إلى بطاقات سؤال وجواب للمراجعة السريعة.", en: "Turn your material into question-and-answer cards." },
  toolQuiz: { ar: "اختبار تجريبي", en: "Practice quiz" },
  toolQuizBody: { ar: "أسئلة اختيار من متعدد مع الإجابات لتقيس فهمك.", en: "Multiple-choice questions with answers to test yourself." },
  toolExplain: { ar: "اشرح لي ببساطة", en: "Explain simply" },
  toolExplainBody: { ar: "اشرح مفهوماً صعباً بلغة بسيطة مع أمثلة.", en: "Break a hard concept down with simple language and examples." },
  toolStudyPlan: { ar: "خطة مذاكرة", en: "Study plan" },
  toolStudyPlanBody: { ar: "جدول مذاكرة مقسّم على الأيام حتى موعد الاختبار.", en: "A day-by-day schedule up to your exam date." },
  pasteMaterial: { ar: "الصق المادة الدراسية هنا…", en: "Paste your study material here…" },
  orUploadDoc: { ar: "أو ارفع ملف PDF / Word", en: "Or upload a PDF / Word file" },
  run: { ar: "تشغيل", en: "Run" },
  result: { ar: "النتيجة", en: "Result" },
  copy: { ar: "نسخ", en: "Copy" },
  copied: { ar: "تم النسخ", en: "Copied" },
  emptyInput: { ar: "أدخل نصاً أو ارفع ملفاً أولاً", en: "Add text or upload a file first" },
  // --- Flow chart interaction ---
  clickNodeHint: { ar: "اضغط على أي مادة لإبراز مسبقاتها والمواد التي تفتحها.", en: "Click any course to highlight its prerequisites and what it unlocks." },
  clearSelection: { ar: "إلغاء التحديد", en: "Clear selection" },
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
