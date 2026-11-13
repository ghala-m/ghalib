import { useState } from "react";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  InstallPerks,
  PhoneIllustration,
  StepIllustration,
  type StepKind,
} from "@/components/app/InstallGraphics";
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
    perks: ["وصول أسرع", "بدون شريط المتصفح", "تنبيهات المواعيد"] as [string, string, string],
    shareSheetAdd: "إضافة إلى الشاشة الرئيسية",
    add: "إضافة",
    installApp: "تثبيت التطبيق",
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
    perks: ["Faster access", "No browser bar", "Deadline alerts"] as [string, string, string],
    shareSheetAdd: "Add to Home Screen",
    add: "Add",
    installApp: "Install app",
  },
} as const;

function Steps({ lang, ios }: { lang: "ar" | "en"; ios: boolean }) {
  const c = TEXT[lang];
  const rows: { kind: StepKind; text: string; label?: string }[] = ios
    ? [
        { kind: "ios-share", text: c.ios1 },
        { kind: "ios-add", text: c.ios2, label: c.shareSheetAdd },
        { kind: "ios-confirm", text: c.ios3, label: c.add },
      ]
    : [
        { kind: "menu", text: c.other1 },
        { kind: "install", text: c.other2, label: c.installApp },
      ];
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">{ios ? c.iosIntro : c.otherIntro}</p>
      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.kind} className="rounded-2xl border bg-card p-3">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                {i + 1}
              </span>
              <span className="font-medium">{r.text}</span>
            </div>
            <StepIllustration kind={r.kind} {...(r.label ? { label: r.label } : {})} />
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
        className={cn(
          "relative overflow-hidden rounded-2xl border",
          variant === "banner" ? "mb-6 border-accent/40 bg-accent/10 p-4" : "bg-card p-5",
        )}
      >
        <div className="flex items-center gap-4">
          <PhoneIllustration size={variant === "banner" ? "sm" : "lg"} />
          <div className="min-w-0 flex-1 text-sm">
            <p className={cn("font-bold", variant === "banner" ? "" : "text-base")}>{c.title}</p>
            <p className="mt-1 text-muted-foreground">{c.body}</p>
            {variant === "card" ? <InstallPerks items={c.perks} /> : null}
            <Button size="sm" className="mt-3" onClick={onInstall}>
              <Download className="me-1 size-4" />
              {c.install}
            </Button>
          </div>
        </div>
        {variant === "banner" ? (
          <button
            type="button"
            aria-label={c.dismiss}
            onClick={dismiss}
            className="absolute end-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir} className="max-h-[90vh] overflow-y-auto sm:max-w-md">
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
