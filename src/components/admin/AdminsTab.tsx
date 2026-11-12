import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "student" | "tech";

const TEXT = {
  ar: {
    hint: "المشرف الطلابي يرى صفحة التحكم (البلاغات والكتالوج) فقط. المشرف التقني يرى كل شيء فيها، ويدير المشرفين، وله حساب طالب عادي أيضاً.",
    email: "بريد الحساب (لازم يكون مسجلاً في الموقع)",
    role: "الصلاحية",
    student: "مشرف طلابي",
    tech: "مشرف تقني",
    add: "إضافة / تحديث",
    remove: "إزالة",
    you: "أنت",
    added: "تم الحفظ",
    removed: "تمت الإزالة",
    notFound: "لا يوجد حساب بهذا البريد. اطلب منه التسجيل في الموقع أولاً.",
    lastTech: "لا يمكن إزالة أو تخفيض آخر مشرف تقني.",
    failed: "تعذّر تنفيذ العملية",
    loading: "جارٍ التحميل…",
  },
  en: {
    hint: "A student admin only sees the control page (reports and catalog). A technical admin sees everything there, manages admins, and also has an ordinary student account.",
    email: "Account email (must already be registered on the site)",
    role: "Role",
    student: "Student admin",
    tech: "Technical admin",
    add: "Add / update",
    remove: "Remove",
    you: "You",
    added: "Saved",
    removed: "Removed",
    notFound: "No account with that email. Ask them to sign up first.",
    lastTech: "You can't remove or demote the last technical admin.",
    failed: "Couldn't complete that",
    loading: "Loading…",
  },
} as const;

export function AdminsTab() {
  const { user } = useAuth();
  const { lang, dir } = useI18n();
  const c = TEXT[lang];
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("student");

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admin-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_admins");
      if (error) throw error;
      return data ?? [];
    },
  });

  const onError = (e: { message?: string }) => {
    const m = e.message ?? "";
    toast.error(
      m.includes("user not found") ? c.notFound : m.includes("last tech") ? c.lastTech : c.failed,
    );
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-list"] });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_set_admin", {
        p_email: email.trim(),
        p_role: role,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setEmail("");
      await refresh();
      toast.success(c.added);
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_remove_admin", { p_user_id: id });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success(c.removed);
    },
    onError,
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{c.hint}</p>

      <form
        className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) add.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="admin-email">{c.email}</Label>
          <Input
            id="admin-email"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{c.role}</Label>
          <Select value={role} onValueChange={(v) => setRole(v === "tech" ? "tech" : "student")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={dir}>
              <SelectItem value="student">{c.student}</SelectItem>
              <SelectItem value="tech">{c.tech}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={!email.trim() || add.isPending}>
          <UserPlus className="me-1 size-4" />
          {c.add}
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{c.loading}</p>
      ) : (
        <ul className="space-y-2">
          {admins.map((a) => (
            <li
              key={a.user_id}
              className="flex items-center gap-2 rounded-2xl border bg-card p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm" dir="ltr">
                  {a.email}
                </div>
                <div className="mt-1 flex gap-2">
                  <Badge variant={a.role === "tech" ? "default" : "secondary"}>
                    {a.role === "tech" ? c.tech : c.student}
                  </Badge>
                  {a.user_id === user?.id ? <Badge variant="outline">{c.you}</Badge> : null}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={c.remove}
                disabled={remove.isPending}
                onClick={() => remove.mutate(a.user_id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
