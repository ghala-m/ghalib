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
