# نقل غالِب خارج Lovable (قاعدة بيانات + استضافة مجانية) — دليل سريع

الهدف: يشتغل الموقع حتى لو رصيد Lovable خلص. كل الخطوات مجانية، وتاخذ تقريباً 30–40 دقيقة.
**اعملي الخطوات بالترتيب. إذا علقتِ بأي خطوة ابعثي لي لقطة شاشة.**

> الملف `supabase/setup-new-project.sql` اختبرته على قاعدة PostgreSQL حقيقية: ينشئ كل الجداول، وسياسات الأمان، وتريجر إنشاء الملف الشخصي عند التسجيل، ومخزن ملفات السيلابس.
> **ملاحظة:** الحسابات والبيانات القديمة على خلفية Lovable ما تنتقل تلقائياً. الحسابات الجديدة تُنشأ من جديد.

---

## الخطوة 1 — مشروع Supabase جديد (مجاني)
1. ادخلي https://supabase.com وسجّلي بحساب Google، ثم **New project**.
2. الاسم: `ghalib`. اختاري منطقة قريبة (مثلاً Frankfurt أو Bahrain إن وُجد). اكتبي كلمة مرور قاعدة بيانات واحفظيها.
3. انتظري دقيقتين لين يجهز.

## الخطوة 2 — إنشاء الجداول
1. من القائمة اليسار: **SQL Editor** ثم **New query**.
2. افتحي الملف `supabase/setup-new-project.sql` من المشروع، انسخي كل محتواه والصقيه، واضغطي **Run**.
3. لازم تشوفي `Success`. شغّليه **مرة واحدة فقط** على مشروع فاضي.

## الخطوة 3 — إعدادات تسجيل الدخول
في **Authentication**:
- **Sign In / Providers ← Email**: فعّليه. ولتجربة أسلس للزوار عطّلي **Confirm email** (بدونه يدخل الزائر مباشرة بعد التسجيل).
- **URL Configuration**:
  - **Site URL**: رابط موقعك الجديد (تحصلينه بالخطوة 5، وتقدرين ترجعين تعدلينه).
  - **Redirect URLs**: أضيفي `https://رابط-موقعك/*`.

(اختياري) **Google**: Providers ← Google ← فعّليه، وحطي Client ID وSecret من Google Cloud Console (OAuth client من نوع Web، وأضيفي رابط callback اللي يعرضه Supabase). إذا ما تبينه الحين، أخفي زر Google أو اتركيه، لأن الدخول بالبريد يكفي للبداية.

## الخطوة 4 — مفاتيح الاتصال
من **Project Settings ← API Keys** (أو API) انسخي:
- **Project URL** مثل `https://xxxx.supabase.co`
- **Publishable key** (يبدأ بـ `sb_publishable_` أو anon key القديم)
- **Secret / service_role key** (سري جداً، لا تنشريه ولا تحطيه بأي ملف عام)

## الخطوة 5 — استضافة الموقع على Cloudflare (مجاني)
1. ارفعي المشروع على GitHub (الريبو `ghala-m/ghalib`): استبدلي الملفات بالنسخة الجديدة، ثم commit وpush.
2. ادخلي https://dash.cloudflare.com ← **Workers & Pages** ← **Create** ← **Import a repository** وربطي GitHub واختاري الريبو.
3. الإعدادات:
   - **Build command**: `npm install && npm run build`
   - **Deploy command**: `npx wrangler deploy --config .output/server/wrangler.json`
4. **Variables and secrets** (أضيفيها كلها، بنفس الأسماء بالضبط):

| الاسم | القيمة |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (اجعليه **Secret**) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | مفتاح Gemini المجاني من https://aistudio.google.com/apikey (للمرشد وأدوات الدراسة) |
| `VITE_NATIVE_GOOGLE_AUTH` | `true` (فقط إذا فعّلتِ Google بالخطوة 3) |
| `VITE_VAPID_PUBLIC_KEY` | نفس القيمة الموجودة بملف `.env` الحالي (للتنبيهات) |

5. اضغطي **Save and Deploy**. بعد دقيقتين تحصلين رابط `https://....workers.dev`. ارجعي للخطوة 3 وحطي الرابط بـ Site URL وRedirect URLs.

> لأي متغير يبدأ بـ `VITE_` لازم يكون موجوداً **قبل** البناء. إذا غيّرتيه لاحقاً اعملي Deploy جديد.

## الخطوة 6 — جرّبي قبل ما تشاركين الرابط
- أنشئي حساب جديد وادخلي، وافتحي الداشبورد والمرشد وأدوات الدراسة.
- إذا المرشد ما رد: تأكدي من `GOOGLE_GENERATIVE_AI_API_KEY`.

## أشياء لاحقة (مو ضرورية لأول زوار)
- **تنبيهات الدفع وملخص الصباح**: تعتمد على دوال Supabase Edge Functions الموجودة بمجلد `supabase/functions` وتحتاج نشر عبر Supabase CLI. باقي الموقع يشتغل بدونها.
- **الدومين الخاص**: من Cloudflare ← Workers ← Domains.
