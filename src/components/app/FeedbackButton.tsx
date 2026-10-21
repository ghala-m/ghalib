import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MessageCircleHeart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import {
  CONTACT_EMAIL,
  CONTACT_INSTAGRAM,
  CONTACT_WHATSAPP,
  COPYRIGHT_YEAR,
  OWNER_NAME,
  OWNER_NAME_EN,
} from "@/lib/app-info";

const COPY = {
  ar: {
    button: "ملاحظات وتواصل",
    title: "شاركنا رأيك",
    intro:
      "هذا التطبيق من تصميم وتطوير صاحبة المشروع: المهندسة غلا، وهو حالياً نسخة تجريبية. تجربتك تساعدني على تحسينه قبل إطلاقه كتطبيق رسمي.",
    ask: "للإبلاغ عن مشكلة، أو اقتراح، أو طلب ميزة، أو لأي سؤال، تواصل معي عبر:",
    email: "راسلني بالبريد الإلكتروني",
    whatsapp: "راسلني عبر واتساب",
    instagram: "راسلني على انستغرام",
    none: "قنوات التواصل قيد الإعداد.",
    tip: "عند الإبلاغ عن مشكلة اذكر: الصفحة، وما الذي ضغطت عليه، ونوع جهازك. ويفضّل إرفاق صورة للمشكلة.",
    subject: "ملاحظات على تطبيق غالِب",
    wa: "مرحباً، عندي ملاحظة على تطبيق غالِب:",
    rights: "جميع الحقوق محفوظة. لا يجوز نسخ التطبيق أو أي جزء منه أو إعادة استخدامه دون إذن خطي.",
    madeBy: "صُنع بواسطة",
  },
  en: {
    button: "Feedback & contact",
    title: "Share your feedback",
    intro:
      "This app was designed and built by its owner, Eng. Ghala, and is currently a beta version. Your experience helps improve it before it launches as an official app.",
    ask: "To report a problem, suggest an idea, request a feature or ask a question, contact me via:",
    email: "Email me",
    whatsapp: "Message me on WhatsApp",
    instagram: "DM me on Instagram",
    none: "Contact channels are being set up.",
    tip: "When reporting a problem, mention the page, what you tapped, and your device. A screenshot of the problem helps a lot.",
    subject: "Feedback on Ghalib",
    wa: "Hi, I have feedback on Ghalib:",
    rights:
      "All rights reserved. No part of this app may be copied or reused without written permission.",
    madeBy: "Made by",
  },
} as const;

/** One-line copyright notice, reused on the landing/sign-in pages. */
export function CopyrightNotice({ className }: { className?: string | undefined }) {
  const { lang } = useI18n();
  const c = COPY[lang];
  const owner = lang === "ar" ? OWNER_NAME : OWNER_NAME_EN;
  return (
    <p className={className}>
      © {COPYRIGHT_YEAR} {owner ? `${owner} · ` : ""}
      {c.rights}
    </p>
  );
}

/** Small floating button (bottom corner) that opens the feedback / contact / copyright card. */
export function FeedbackButton({ className }: { className?: string | undefined }) {
  const { lang } = useI18n();
  const c = COPY[lang];
  const [open, setOpen] = useState(false);
  const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(c.subject)}`;
  const waHref = `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(c.wa)}`;
  const hasChannel = Boolean(CONTACT_EMAIL || CONTACT_WHATSAPP || CONTACT_INSTAGRAM);
  const owner = lang === "ar" ? OWNER_NAME : OWNER_NAME_EN;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={c.button}
        className={
          className ??
          "fixed bottom-4 end-4 z-30 flex items-center gap-2 rounded-full bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 sm:text-sm"
        }
      >
        <MessageCircleHeart className="size-4" />
        <span className="hidden sm:inline">{c.button}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircleHeart className="size-5 text-accent" />
              {c.title}
            </DialogTitle>
            <DialogDescription>{c.intro}</DialogDescription>
          </DialogHeader>

          <p className="text-sm font-medium">{c.ask}</p>
          {hasChannel ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {CONTACT_EMAIL && (
                <Button asChild size="lg">
                  <a href={mailHref}>
                    <Mail className="size-4" />
                    {c.email}
                  </a>
                </Button>
              )}
              {CONTACT_INSTAGRAM && (
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-500 text-white hover:opacity-90"
                >
                  <a
                    href={`https://instagram.com/${CONTACT_INSTAGRAM}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram className="size-4" />
                    {c.instagram}
                  </a>
                </Button>
              )}
              {CONTACT_WHATSAPP && (
                <Button
                  asChild
                  size="lg"
                  className="bg-emerald-600 text-white hover:bg-emerald-600/90"
                >
                  <a href={waHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4" />
                    {c.whatsapp}
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{c.none}</p>
          )}
          <p className="text-xs text-muted-foreground">{c.tip}</p>

          <div className="border-t border-border pt-3 text-xs text-muted-foreground">
            <p>
              © {COPYRIGHT_YEAR} {owner ? `${c.madeBy} ${owner}. ` : ""}
              {c.rights}
            </p>
            <Link
              to="/"
              className="mt-1 inline-block hover:underline"
              onClick={() => setOpen(false)}
            >
              Ghalib · غالِب
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
