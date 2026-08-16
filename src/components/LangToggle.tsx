import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function LangToggle({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const { lang, setLang, t } = useI18n();
  return (
    <Button variant={variant} size="sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
      <Languages className="size-4" />
      {t("langSwitch")}
    </Button>
  );
}
