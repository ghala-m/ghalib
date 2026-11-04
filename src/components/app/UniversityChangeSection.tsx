import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { History } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { UniversitySelect } from "@/components/app/UniversitySelect";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { universityLabel } from "@/lib/universities";
import {
  ARCHIVE_DAYS,
  daysLeft,
  listArchives,
  restoreArchive,
  switchUniversity,
} from "@/lib/university-switch";

/**
 * "University" field inside Settings → Basic info.
 *  - First time (no university yet): saved directly.
 *  - Changing to another one: asks for confirmation first (it means leaving the old university),
 *    archives the old university's data for 30 days, and restarts onboarding for the new one.
 *  - Lists archived universities with a "restore" button until their 30 days run out.
 */
export function UniversityChangeSection({ current }: { current: string }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const archives = useQuery({
    queryKey: ["university-archives", user?.id],
    enabled: !!user,
    queryFn: () => listArchives(user!.id),
  });

  const refreshAll = async () => {
    await qc.invalidateQueries();
  };

  const change = useMutation({
    mutationFn: async (next: string) => {
      if (!user) throw new Error("no user");
      if (!current.trim()) {
        // Nothing to leave behind: just record the university.
        const { error } = await supabase
          .from("profiles")
          .update({ university: next.trim() })
          .eq("id", user.id);
        if (error) throw error;
        return { switched: false };
      }
      await switchUniversity(user.id, current, next);
      return { switched: true };
    },
    onSuccess: async ({ switched }) => {
      setPending(null);
      await refreshAll();
      if (switched) {
        toast.success(t("universitySwitched").replace("{days}", String(ARCHIVE_DAYS)));
        navigate({ to: "/onboarding" });
      } else {
        toast.success(t("saved"));
      }
    },
    onError: () => {
      setPending(null);
      toast.error(t("saveFailed"));
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("no user");
      await restoreArchive(user.id, id, current);
    },
    onSuccess: async () => {
      setRestoreId(null);
      await refreshAll();
      toast.success(t("universityRestored"));
    },
    onError: (e: Error) => {
      setRestoreId(null);
      toast.error(e.message === "expired" ? t("archiveExpired") : t("saveFailed"));
    },
  });

  const handlePick = (next: string) => {
    if (next.trim() === current.trim()) return;
    if (!current.trim()) {
      change.mutate(next);
      return;
    }
    setPending(next);
  };

  const restoreTarget = archives.data?.find((a) => a.id === restoreId);

  return (
    <div className="space-y-2">
      <Label htmlFor="university">{t("university")}</Label>
      <UniversitySelect
        id="university"
        value={current}
        onChange={handlePick}
        commitLabel={t("change")}
        disabled={change.isPending}
      />
      <p className="text-xs text-muted-foreground">{t("universityChangeHint")}</p>

      {archives.data && archives.data.length > 0 && (
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <History className="size-4 text-accent" />
            {t("previousUniversities")}
          </p>
          {archives.data.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">{universityLabel(a.university, lang)}</p>
                <p className="text-xs text-muted-foreground">
                  {t("archiveDaysLeft").replace("{days}", String(daysLeft(a.expires_at)))}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setRestoreId(a.id)}>
                {t("restoreData")}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm: leaving the current university */}
      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("switchUniversityTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t("switchUniversityBody")
                  .replace("{from}", universityLabel(current, lang))
                  .replace("{to}", pending ? universityLabel(pending, lang) : "")}
              </span>
              <span className="block font-medium text-foreground">
                {t("switchUniversityGrace").replace("{days}", String(ARCHIVE_DAYS))}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={change.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pending) change.mutate(pending);
              }}
            >
              {t("confirmSwitch")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: restoring an archived university */}
      <AlertDialog open={restoreId !== null} onOpenChange={(o) => !o && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("restoreTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("restoreBody")
                .replace(
                  "{to}",
                  restoreTarget ? universityLabel(restoreTarget.university, lang) : "",
                )
                .replace("{from}", universityLabel(current, lang) || "—")
                .replace("{days}", String(ARCHIVE_DAYS))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={restore.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (restoreId) restore.mutate(restoreId);
              }}
            >
              {t("restoreData")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
