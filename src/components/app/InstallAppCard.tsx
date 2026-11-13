import { useState } from "react";
import { Download, MoreVertical, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DISMISS_KEY = "ghalib-install-dismissed";

const TEXT = {
  ar: {
    title: "ثبّت غالب كتطبيق",
    body: "يفتح مباشرة من شاشة هاتفك بدون شريط المتصفح، وأسرع في الوصول لموادك ودرجاتك.",
    install: "تثبيت التطبيق",
    installed: "التطبيق مثبّت على هذا الجهاز.",
    howTitle: "كيف تثبّت التطبيق",
    iosIntro: "في آيفون وآيباد، افتح الموقع من متصفح Safari ثم:",
    ios1: "اضغط زر المشاركة",
    ios2: "اختر «إضافة إلى الشاشة الرئيسية»",
    ios3: "اضغط «إضافة»",
    iosNote: "إشعارات الهاتف لا تعمل على آيفون إلا بعد التثبيت بهذه الطريقة.",
    otherIntro: "من متصفح Chrome أو Edge:",
    other1: "افتح قائمة المتصفح",
    other2: "اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»",
    dismiss: "إخفاء",
  },
  en: {
    title: "Install Ghalib as an app",
    body: "Opens straight from your home screen without the browser bar, and gets you to your courses and grades faster.",
    install: "Install app",
    installed: "The app is installed on this device.",
    howTitle: "How to install the app",
    iosIntro: "On iPhone and iPad, open the site in Safari, then:",
    ios1: "Tap the Share button",
    ios2: "Choose “Add to Home Screen”",
    ios3: "Tap “Add”",
    iosNote: "Phone notifications only work on iPhone once it's installed this way.",
    otherIntro: "In Chrome or Edge:",
    other1: "Open the browser menu",
    other2: "Choose “Install app” or “Add to Home screen”",
    dismiss: "Dismiss",
  },
} as const;

function Steps({ lang, ios }: { lang: "ar" | "en"; ios: boolean }) {
  const c = TEXT[lang];
  const rows = ios
    ? [
        { icon: Share, text: c.ios1 },
        { icon: PlusSquare, text: c.ios2 },
        { icon: Download, text: c.ios3 },
      ]
    : [
        { icon: MoreVertical, text: c.other1 },
        { icon: Download, text: c.other2 },
      ];
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">{ios ? c.iosIntro : c.otherIntro}</p>
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.text} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
              {i + 1}
            </span>
            <r.icon className="size-4 shrink-0 text-muted-foreground" />
            <span>{r.text}</span>
          </li>
        ))}
      </ol>
      {ios ? <p className="text-xs text-muted-foreground">{c.iosNote}</p> : null}
    </div>
  );
}

/**
 * "Install the app" call to action.
 *  - variant "card": always on (settings) — also tells you when it's already installed.
 *  - variant "banner": dashboard, only when installable and not dismissed before.
 */
export function InstallAppCard({ variant = "card" }: { variant?: "card" | "banner" }) {
  const { lang, dir } = useI18n();
  const c = TEXT[lang];
  const { installed, isIos, canPrompt, canInstall, promptInstall } = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode: just hide for this visit */
    }
  };
  const onInstall = async () => {
    if (canPrompt) await promptInstall();
    else setOpen(true);
  };

  if (variant === "banner" && (!canInstall || dismissed)) return null;
  if (variant === "card" && installed) {
    return <p className="text-sm text-muted-foreground">{c.installed}</p>;
  }

  return (
    <>
      <div
        className={
          variant === "banner"
            ? "mb-6 flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4"
            : "flex items-start gap-3 rounded-2xl border bg-card p-4"
        }
      >
        <Smartphone className="mt-0.5 size-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">{c.title}</p>
          <p className="mt-0.5 text-muted-foreground">{c.body}</p>
          <Button size="sm" className="mt-3" onClick={onInstall}>
            <Download className="me-1 size-4" />
            {c.install}
          </Button>
        </div>
        {variant === "banner" ? (
          <button
            type="button"
            aria-label={c.dismiss}
            onClick={dismiss}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{c.howTitle}</DialogTitle>
            <DialogDescription className="sr-only">{c.howTitle}</DialogDescription>
          </DialogHeader>
          <Steps lang={lang} ios={isIos} />
        </DialogContent>
      </Dialog>
    </>
  );
}
