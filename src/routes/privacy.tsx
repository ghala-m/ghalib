import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Terms — Ghalib" },
      {
        name: "description",
        content: "How Ghalib handles student data, and the terms of using the service.",
      },
    ],
  }),
  component: PrivacyPage,
});

const UPDATED = "2026-11-14";

type Section = { h: string; p: string[] };

const CONTENT: Record<
  "ar" | "en",
  {
    title: string;
    updated: string;
    back: string;
    privacy: string;
    terms: string;
    privacySections: Section[];
    termsSections: Section[];
  }
> = {
  ar: {
    title: "الخصوصية وشروط الاستخدام",
    updated: "آخر تحديث",
    back: "رجوع",
    privacy: "سياسة الخصوصية",
    terms: "شروط الاستخدام",
    privacySections: [
      {
        h: "ما البيانات التي نحفظها؟",
        p: [
          "الحساب: بريدك الإلكتروني واسمك (أو بيانات تسجيل الدخول عبر Google).",
          "الملف الأكاديمي: الجامعة والكلية والتخصص والفصل الحالي والمعدلات التي تدخلها.",
          "دراستك: موادك ودرجاتك وأوزان التقييم والمهام والتقويم وسلسلة الدراسة.",
          "المحتوى الذي تنشئه أو ترفعه: ملفات الخطة الدراسية (syllabus) وخطة التخصص، ومواد الدراسة التي يولّدها الذكاء الاصطناعي، ومحادثات المرشد الذكي.",
          "التقييمات في منتدى الدكاترة، والبلاغات والملاحظات التي ترسلها.",
          "بيانات الإشعارات إذا فعّلتها، وسجل تقني بسيط لطلبات الذكاء الاصطناعي (اسم الأداة ووقتها) لحماية الخدمة من الإساءة.",
        ],
      },
      {
        h: "كيف نستخدمها؟",
        p: [
          "لتشغيل الخدمة فقط: حساب معدلك وخطتك، وعرض موادك، وتذكيرك بالمواعيد.",
          "عند استخدامك ميزات الذكاء الاصطناعي، يُرسل المحتوى المطلوب (مثل نص الخطة الدراسية أو سؤالك) إلى مزوّد خدمة الذكاء الاصطناعي لتوليد الإجابة، ولا نستخدمه للإعلانات.",
          "لا نبيع بياناتك ولا نشاركها مع جهات تسويقية.",
        ],
      },
      {
        h: "من يمكنه رؤية بياناتك؟",
        p: [
          "أنت وحدك ترى درجاتك وموادك ومحادثاتك؛ تُحمى كل بيانات حسابك بقواعد وصول على مستوى قاعدة البيانات.",
          "منتدى الدكاترة: تقييماتك ظاهرة لطلاب جامعة الدكتور فقط، ويظهر اسمك بحرفه الأول فقط (مثل «غ•••») أو كـ «طالب مجهول» إن اخترت ذلك.",
          "أدوات الإشراف في الموقع تعرض أرقاماً إجمالية وبلاغات الكتالوج فقط، ولا تعرض درجاتك ولا موادك.",
          "نستعين بمزوّدين تقنيين لاستضافة الموقع وقاعدة البيانات وخدمة الذكاء الاصطناعي لتشغيل الخدمة.",
        ],
      },
      {
        h: "المدة والحذف",
        p: [
          "نحتفظ ببياناتك ما دام حسابك فعالاً.",
          "عند تغيير جامعتك تُحفظ نسخة من بيانات الجامعة السابقة 30 يوماً قابلة للاسترجاع، ثم تبقى للعرض فقط سنة كاملة، ثم تُحذف نهائياً مع ملفاتها المرفوعة. يمكنك تنزيل نسخة منها قبل ذلك.",
          "يمكنك من الإعدادات إعادة ضبط بياناتك الدراسية وحذف ملفاتك المرفوعة في أي وقت.",
          "لطلب حذف حسابك كاملاً أرسل طلباً عبر زر الملاحظات داخل التطبيق.",
        ],
      },
      {
        h: "التواصل",
        p: [
          "لأي سؤال عن بياناتك أو طلب تصحيح أو حذف، استخدم زر الملاحظات داخل التطبيق وسنردّ عليك.",
        ],
      },
    ],
    termsSections: [
      {
        h: "طبيعة الخدمة",
        p: [
          "غالب أداة مساعدة للتخطيط الأكاديمي، وليس مرجعاً رسمياً. المعدلات والتوقعات تقديرية بحسب ما تدخله، والمرجع النهائي هو جامعتك.",
          "قد يخطئ الذكاء الاصطناعي. راجع المعلومات المهمة (المتطلبات السابقة، المواعيد، الدرجات) مع جامعتك قبل أي قرار.",
        ],
      },
      {
        h: "استخدامك للحساب",
        p: [
          "أنت مسؤول عن صحة ما تدخله وعن سرية حسابك.",
          "لا تستخدم الخدمة لإساءة أو اختراق أو إرسال طلبات آلية مفرطة، وقد نقيّد الاستخدام عند الإساءة.",
          "ارفع ملفات تملك حق استخدامها فقط.",
        ],
      },
      {
        h: "منتدى الدكاترة",
        p: [
          "التقييم يخص التجربة الأكاديمية فقط. يُمنع السب والإساءة والتعدي الشخصي والمعلومات الخاصة.",
          "نحذف التقييمات المخالفة، وقد نوقف الحساب المسيء.",
        ],
      },
      {
        h: "التعديلات والمسؤولية",
        p: [
          "قد نطوّر الخدمة أو نعدّل هذه الشروط، وسنحدّث تاريخ الصفحة عند ذلك.",
          "تُقدَّم الخدمة كما هي دون ضمان بخلوّها من الأخطاء أو انقطاعها.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy & Terms",
    updated: "Last updated",
    back: "Back",
    privacy: "Privacy policy",
    terms: "Terms of use",
    privacySections: [
      {
        h: "What data we keep",
        p: [
          "Account: your email and name (or your Google sign-in details).",
          "Academic profile: university, college, major, current term and the GPA figures you enter.",
          "Your studies: courses, grades, grading weights, tasks, calendar and study streak.",
          "Content you create or upload: syllabus and major-plan files, AI-generated study materials and advisor chats.",
          "Your professor-forum reviews, and any reports or feedback you send.",
          "Notification details if you turn them on, and a simple technical log of AI requests (tool name and time) used to protect the service from abuse.",
        ],
      },
      {
        h: "How we use it",
        p: [
          "Only to run the service: calculate your GPA and plan, show your courses and remind you of deadlines.",
          "When you use AI features, the content needed (for example syllabus text or your question) is sent to an AI provider to produce the answer. It is not used for advertising.",
          "We don't sell your data or share it with marketers.",
        ],
      },
      {
        h: "Who can see it",
        p: [
          "Only you can see your grades, materials and chats; account data is protected by database-level access rules.",
          "Professor forum: your review is visible only to students of that professor's university, and your name appears as its first letter only (e.g. “G•••”) or as “Anonymous student” if you choose.",
          "The site's admin tools show totals and catalog reports only, never your grades or materials.",
          "We rely on technical providers for hosting, the database and the AI service to run the product.",
        ],
      },
      {
        h: "Retention and deletion",
        p: [
          "We keep your data while your account is active.",
          "When you switch university, the previous university's data is kept for 30 days so you can restore it, then stays read-only for one more year, then is permanently deleted along with its uploaded files. You can download a copy before then.",
          "From Settings you can reset your study data and delete your uploaded files at any time.",
          "To have your whole account deleted, send a request through the in-app feedback button.",
        ],
      },
      {
        h: "Contact",
        p: [
          "For any question about your data, or to ask for a correction or deletion, use the in-app feedback button and we'll reply.",
        ],
      },
    ],
    termsSections: [
      {
        h: "What the service is",
        p: [
          "Ghalib is an academic planning aid, not an official record. GPA figures and forecasts are estimates based on what you enter; your university's records are the final reference.",
          "AI can be wrong. Check anything important (prerequisites, deadlines, grades) with your university before acting on it.",
        ],
      },
      {
        h: "Using your account",
        p: [
          "You're responsible for what you enter and for keeping your account secure.",
          "Don't abuse the service, attack it, or send excessive automated requests; we may restrict use if you do.",
          "Only upload files you have the right to use.",
        ],
      },
      {
        h: "Professor forum",
        p: [
          "Reviews are about the academic experience only. Insults, abuse, personal attacks and private information are not allowed.",
          "We remove violating reviews and may suspend abusive accounts.",
        ],
      },
      {
        h: "Changes and liability",
        p: [
          "We may improve the service or change these terms; the date on this page is updated when we do.",
          "The service is provided as is, with no guarantee that it is error-free or always available.",
        ],
      },
    ],
  },
};

function SectionList({ title, sections }: { title: string; sections: Section[] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      <div className="space-y-5">
        {sections.map((s) => (
          <div key={s.h}>
            <h3 className="mb-1.5 font-semibold">{s.h}</h3>
            <ul className="list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-muted-foreground marker:text-accent">
              {s.p.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function PrivacyPage() {
  const { lang, dir } = useI18n();
  const c = CONTENT[lang];
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div dir={dir} className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <Back className="size-4" />
        {c.back}
      </Link>

      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{c.title}</h1>
          <p className="text-xs text-muted-foreground">
            {c.updated}: {UPDATED}
          </p>
        </div>
      </header>

      <SectionList title={c.privacy} sections={c.privacySections} />
      <SectionList title={c.terms} sections={c.termsSections} />
    </div>
  );
}
