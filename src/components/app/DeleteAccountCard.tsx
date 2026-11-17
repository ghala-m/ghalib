import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, UserX } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { removeAllUserFiles } from "@/lib/storage-cleanup";

const TEXT = {
  ar: {
    title: "حذف حسابي نهائياً",
    hint: "يحذف حسابك وكل بياناتك (المواد والدرجات والمحادثات والملفات والأرشيف وتقييماتك للدكاترة) ولا يمكن التراجع عنه. إن كنت تريد فقط البدء من جديد، استخدم «إعادة ضبط الحساب» بدلاً من ذلك.",
    confirmTitle: "هل أنت متأكد من حذف حسابك؟",
    typeHint: "اكتب DELETE للتأكيد.",
    cancel: "إلغاء",
    action: "حذف حسابي",
    working: "جارٍ الحذف…",
    done: "تم حذف حسابك وبياناتك.",
    failed: "تعذّر حذف الحساب. حاول مرة أخرى أو تواصل معنا.",
  },
  en: {
    title: "Delete my account permanently",
    hint: "Deletes your account and all your data (courses, grades, chats, files, archives and your professor reviews). This cannot be undone. If you only want a fresh start, use “Reset account” instead.",
    confirmTitle: "Are you sure you want to delete your account?",
    typeHint: "Type DELETE to confirm.",
    cancel: "Cancel",
    action: "Delete my account",
    working: "Deleting…",
    done: "Your account and data were deleted.",
    failed: "Couldn't delete the account. Try again or contact us.",
  },
} as const;

export function DeleteAccountCard() {
  const { lang } = useI18n();
  const c = TEXT[lang];
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  const del = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      await removeAllUserFiles(user.id);
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
    },
    onSuccess: async () => {
      setOpen(false);
      toast.success(c.done);
      await supabase.auth.signOut();
      navigate({ to: "/" });
    },
    onError: () => toast.error(c.failed),
  });

  return (
    <section className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
      <h2 className="flex items-center gap-2 font-semibold text-destructive">
        <UserX className="size-4" />
        {c.title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{c.hint}</p>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setConfirm("");
        }}
      >
        <DialogTrigger asChild>
          <Button variant="destructive" className="mt-4">
            {c.action}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{c.confirmTitle}</DialogTitle>
            <DialogDescription>{c.hint}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              aria-label={c.typeHint}
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">{c.typeHint}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {c.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={confirm.trim().toUpperCase() !== "DELETE" || del.isPending}
              onClick={() => del.mutate()}
            >
              {del.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {del.isPending ? c.working : c.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
