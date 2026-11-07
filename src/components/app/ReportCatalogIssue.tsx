import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isMissingSchemaError } from "@/lib/db-errors";
import { useI18n } from "@/lib/i18n";

/**
 * Small link under the University / College / Major pickers: lets a student report a university,
 * college or major that is missing or misspelled. The current selection is attached automatically.
 */
export function ReportCatalogIssue({
  university = "",
  college = "",
  major = "",
}: {
  university?: string;
  college?: string;
  major?: string;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"missing" | "error">("missing");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!user || !message.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("catalog_reports").insert({
      user_id: user.id,
      kind,
      university: university.trim() || null,
      college: college.trim() || null,
      major: major.trim() || null,
      message: message.trim().slice(0, 1000),
    });
    setBusy(false);
    if (error) {
      toast.error(isMissingSchemaError(error) ? t("migrationMissingHint") : t("saveFailed"));
      return;
    }
    toast.success(t("reportThanks"));
    setMessage("");
    setOpen(false);
  };

  const context = [university, college, major].filter((x) => x.trim()).join(" › ");

  return (
    <>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto gap-1.5 p-0 text-xs text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Flag className="size-3.5" />
        {t("reportIssue")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reportTitle")}</DialogTitle>
            <DialogDescription>{t("reportIntro")}</DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={kind}
            onValueChange={(v) => setKind(v as "missing" | "error")}
            className="flex gap-4"
          >
            <Label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="missing" />
              {t("reportMissing")}
            </Label>
            <Label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="error" />
              {t("reportError")}
            </Label>
          </RadioGroup>
          <Textarea
            rows={4}
            maxLength={1000}
            placeholder={t("reportPlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {context && (
            <p className="text-xs text-muted-foreground">
              {t("reportContext")}: {context}
            </p>
          )}
          <Button onClick={send} disabled={busy || !message.trim() || !user}>
            {t("reportSend")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
