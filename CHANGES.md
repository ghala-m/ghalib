# تحديثات غالِب — الدفعة الرابعة

## طريقة التطبيق
فك الضغط داخل المشروع (استبدال الملفات). لا يوجد مايجريشن جديد — كل شي client-side.

## الإضافات

- **كشف الدرجات (Transcript)**: صفحة `/transcript` جديدة — مجمّعة حسب السنة الدراسية ثم الفصل، بنفس بيانات كشفك (رمز/اسم المادة، الوحدات، الدرجة، إحصائيات الفصل والتراكمي)، بس بتصميم بطاقات وألوان حسب مستوى الدرجة بدل جدول نصي، وزر طباعة/حفظ PDF. الوصول لها من زر بصفحة "الملف الأكاديمي" — `src/routes/_authenticated/transcript.tsx`.
- **إعادة تصميم "الملف الأكاديمي"**: هيدر بطاقة متدرّجة، شريط إحصائيات بأيقونات، وكل قسم صار بعنوان+أيقونة+خلفية موحّدة (`SectionCard`) بدل نص عادي — `src/routes/_authenticated/profile.tsx`.
- **إعادة تصميم "المرشد الذكي"**: هيدر بطاقة متدرّجة، أفاتار للمساعد على كل رسالة، اقتراحات بأيقونات، تمييز أوضح للمحادثة النشطة بالقائمة الجانبية — `src/routes/_authenticated/advisor.tsx`, `src/components/app/AdvisorChat.tsx`.
- **الشارات والأصوات**: ٨ شارات إنجاز تُحسب تلقائيًا من بياناتك الموجودة (أول مادة، أول فصل، ٣٠/٦٠/٩٦ وحدة، معدل ٣.٥+، ستريك ٧/٣٠ يوم) — بدون أي عمود جديد بقاعدة البيانات. عند فتح شارة جديدة يطلع toast + نغمة قصيرة (Web Audio، بدون ملف صوتي خارجي)، مع زر لكتم الصوت. تظهر بقسم جديد بصفحة الملف الأكاديمي — `src/lib/achievements.ts`, `src/lib/sound.ts`, `src/components/app/AchievementsBadges.tsx`.

---

# تحديثات غالِب — الدفعة الثالثة

## طريقة التطبيق
1. فك ضغط هذا الملف داخل مجلد المشروع (استبدال الملفات الموجودة بنفس الأسماء) — لا يوجد مايجريشن جديد في هذه الدفعة.
2. إذا تبي التنبيهات وبحث المواقع تشتغل، عبّي `VITE_VAPID_PUBLIC_KEY` و`VITE_GOOGLE_MAPS_API_KEY` في `.env` (شرح كامل بـ EMERGENCE.md).
3. `git add . && git commit -m "feat: registration simulator variety, capstone unit gate, term calendar cleanup, goal tool reset" && git push`

## إصلاحات وتعديلات

- **زر "اختر أفضل تشكيلة" (محاكي التسجيل)**: كان يعطي نفس التشكيلة في كل مرة. الحين كل ضغطة تعطي تشكيلة مختلفة (بنفس الجودة/عدد الفتح) بدل ما يكرر نفس الاقتراح — `src/lib/plan.ts`, `src/routes/_authenticated/simulator.tsx`.
- **Capstone 1**: ما يظهر كمادة "متاحة" (سواء بمخطط المسبقات أو محاكي التسجيل أو "فتح الفصل الجاي") إلا بعد اجتياز ٩٦ وحدة فأكثر، بالإضافة لأي متطلبات سابقة عادية — `src/lib/plan.ts` (دالة `isCapstoneOne` تتعرف عليها بالاسم/الرمز، ما تحتاج عمود جديد بقاعدة البيانات).
- **صفحة "الوصول لهدف معين" (GPA Planner)**: كانت تحفظ آخر قيمة كتبتها بالـ localStorage. الحين ترجع لوضعها الافتراضي فارغة كل ما تدخلها من صفحة ثانية — `src/routes/_authenticated/gpa-planner.tsx`.
- **مخطط المسبقات (Prerequisites Flow Chart)**: الحجم الافتراضي صار ١٠٠٪ دايمًا (بدل التصغير التلقائي للمخططات الكبيرة)، ولو غيّرت الحجم يدويًا ينحفظ ويرجع لك بنفس القيمة المرة الجاية — لين تضغط "إعادة تعيين" — `src/components/app/PrereqFlowChart.tsx`.
- **تقويم الفصل (Term Calendar)**: انشال من الشريط الجانبي، وصار الوصول له عن طريق زر داخل صفحة "التقويم" وزر داخل "تعديل الفصل" بالرئيسية — `src/components/app/AppSidebar.tsx`, `src/routes/_authenticated/calendar.tsx`.
- **تطور المعدل (GPA Trend)**: إذا عندك أكثر من فصلين ولكن معدلات بعضها غير مسجلة، يطلب منك إضافتها بدل رسالة عامة — `src/components/app/GpaTrendChart.tsx`.
- **إنهاء الفصل بمعدل ٠.٠**: لو معدل الفصل طلع بالضبط ٠.٠، يسألك قبل الحفظ إذا هو فصل تمهيدي (بدون كردت، ما يدخل بحساب المعدل التراكمي) أو فصل عادي عليه كردت — `src/components/app/TermControls.tsx`.

## لسه ناقص (مو بهذه الدفعة)
كشف الدرجات القابل للتصدير (PDF)، إعادة تصميم صفحتي الملف الأكاديمي والمرشد الذكي، الشارات والأصوات على الإنجازات — تحتاج جلسة عمل منفصلة (تصميم/تكرار بصري).

---

# تحديثات غالِب — الدفعة الثانية

## طريقة التطبيق
1. فك ضغط هذا الملف داخل مجلد المشروع (استبدال الملفات الموجودة بنفس الأسماء).
2. طبّق المايجريشنين الجديدين:
   - `supabase/migrations/20260830100000_push_and_briefing.sql`
   - `supabase/migrations/20260830110000_study_streak.sql`
3. اقرأ **EMERGENCE.md** بالتفصيل — فيه كل خطوة نشر ناقصة (VAPID keys، Google Maps API key، جدولة pg_cron) بترتيب تنفيذي واضح.
4. `git add . && git commit -m "feat: push notifications, morning briefing, study streak; fix what-if GPA scope" && git push`

## إصلاح
- **حاسبة What-if للـGPA**: صارت تعرض فقط مواد الفصل الحالي (`status === "current"`) بدل عرض كل المواد المستقبلية أيضاً.

## مميزات جديدة (كود كامل، النشر الفعلي يحتاج خطوات من EMERGENCE.md)

### 1. تنبيهات Push حقيقية
- `public/sw.js` — Service Worker
- `src/lib/push.ts` + `src/hooks/usePushNotifications.ts` — اشتراك/إلغاء اشتراك العميل
- `supabase/functions/_shared/{time,push}.ts` — منطق زمني ومنطق إرسال مشترك
- `supabase/functions/send-reminders/index.ts` — Edge Function تُرسل تذكيرات المهام/الأحداث الفعلية

### 2. البريفنج الصباحي
- `supabase/functions/morning-briefing/index.ts` — يحسب وقت الخروج المثالي (حركة مرور + طقس + عدد محاضرات + اختبارات اليوم) ويرسله قبل أول محاضرة بساعة
- واجهة إعدادات كاملة في `src/routes/_authenticated/profile.tsx` (موقع البيت عبر GPS، موقع الجامعة يدوي، وسيلة تنقل، هامش الأمان)

### 3. ستريك الحضور/الدراسة (heatmap على طراز GitHub)
- `src/lib/streak.ts` — منطق بناء الشبكة وحساب الستريك (تحقق منه بـ4 مناطق زمنية مختلفة)
- `src/components/app/StudyStreak.tsx` — المكوّن البصري، مدمج بالداشبورد

## ملفات معدّلة أخرى
- `src/integrations/supabase/types.ts` — جداول/أعمدة جديدة: `push_subscriptions`, `briefing_log`, `study_streak`, + أعمدة `profiles`/`calendar_events`/`course_items`
- `src/lib/queries.ts` — `streakQuery`, `logStreakToday`
- `src/lib/i18n.tsx` — ~35 مفتاح ترجمة جديد
- `src/routes/_authenticated/dashboard.tsx` — إدراج `<StudyStreak />`

## ملاحظة تقنية مهمة
كل حسابات الوقت (التذكيرات + البريفنج) تمر عبر `profiles.timezone` (افتراضي `Asia/Riyadh`) - **لازم** تتأكد إن هذا صحيح لمستخدميك، وإلا التنبيهات بتوصل بوقت غلط.
