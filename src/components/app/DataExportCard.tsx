import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { exportUserData } from "@/lib/data-export";

export function DataExportCard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await exportUserData(user.id);
    } catch (e) {
      console.error("[data-export] failed", e);
      toast.error(t("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-muted/20 p-6">
      <h2 className="font-semibold">{t("exportDataTitle")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("exportDataHint")}</p>
      <Button variant="outline" className="mt-4" onClick={handleExport} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {t("exportDataAction")}
      </Button>
    </section>
  );
}
