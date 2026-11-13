import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

/** Small link to the public privacy policy & terms page. */
export function PrivacyLink({ className }: { className?: string }) {
  const { lang } = useI18n();
  return (
    <Link
      to="/privacy"
      className={className ?? "underline underline-offset-2 hover:text-foreground"}
    >
      {lang === "ar" ? "الخصوصية وشروط الاستخدام" : "Privacy & Terms"}
    </Link>
  );
}
