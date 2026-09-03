import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { resetAccount } from "@/lib/reset";

export function ResetAccountCard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  const reset = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      await resetAccount(user.id);
    },
    onSuccess: async () => {
      setOpen(false);
      setConfirm("");
      await qc.invalidateQueries();
      toast.success(t("resetDone"));
      navigate({ to: "/onboarding" });
    },
    onError: () => toast.error(t("saveFailed")),
  });

  return (
    <section className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
      <h2 className="flex items-center gap-2 font-semibold text-destructive">
        <AlertTriangle className="size-4" />
        {t("dangerZone")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("resetAccountHint")}</p>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setConfirm("");
        }}
      >
        <DialogTrigger asChild>
          <Button variant="destructive" className="mt-4">
            {t("resetAccount")}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("resetConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("resetAccountHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="RESET"
              aria-label={t("resetTypeHint")}
            />
            <p className="text-xs text-muted-foreground">{t("resetTypeHint")}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={confirm.trim().toUpperCase() !== "RESET" || reset.isPending}
              onClick={() => reset.mutate()}
            >
              {reset.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {reset.isPending ? t("resetting") : t("resetAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
