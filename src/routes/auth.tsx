import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { CopyrightNotice, FeedbackButton } from "@/components/app/FeedbackButton";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Ghalib Academic Assistant" },
      { name: "description", content: "Sign in or create your Ghalib account to manage your courses." },
      { property: "og:title", content: "Sign in — Ghalib Academic Assistant" },
      { property: "og:description", content: "Access your AI-powered academic dashboard." },
    ],
  }),
  component: AuthPage,
});

/** Safari says "Load failed", Chrome "Failed to fetch": the request never reached the server. */
function isNetworkError(msg: string) {
  return /load failed|failed to fetch|networkerror|network request failed|fetch/.test(msg);
}

function AuthPage() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed")) toast.error(t("authEmailNotConfirmed"));
        else if (msg.includes("invalid login credentials")) toast.error(t("authInvalidCredentials"));
        else if (isNetworkError(msg)) toast.error(t("authNetworkError"), { duration: 10000 });
        else toast.error(error.message);
        return;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      toast.error(isNetworkError(m.toLowerCase()) ? t("authNetworkError") : m, { duration: 10000 });
    } finally {
      setBusy(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) {
        toast.error(isNetworkError(error.message.toLowerCase()) ? t("authNetworkError") : error.message, { duration: 10000 });
        return;
      }
      // Supabase returns a user with no identities (and no error) when the email is already taken.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        toast.error(t("authEmailExists"));
        return;
      }
      // No session means email confirmation is required: don't bounce to /dashboard
      // (the auth guard would send the user straight back here with no explanation).
      if (!data.session) {
        toast.success(t("authCheckEmail"), { duration: 10000 });
        return;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "OAuth error");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div dir={dir} className="grid-paper flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ScrollText className="size-5" />
          </div>
          <span className="font-display text-lg font-bold">{t("appName")}</span>
        </Link>
      </div>

      <div className="panel w-full max-w-md p-6">
        <Tabs defaultValue="signin">
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="signin">
              {t("signIn")}
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="signup">
              {t("signUp")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form className="space-y-4 pt-4" onSubmit={signIn}>
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy} type="submit">
                {t("signIn")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form className="space-y-4 pt-4" onSubmit={signUp}>
              <div className="space-y-2">
                <Label htmlFor="name">{t("fullName")}</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">{t("email")}</Label>
                <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">{t("password")}</Label>
                <Input
                  id="password2"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy} type="submit">
                {t("signUp")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("or")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={google}>
          {t("continueGoogle")}
        </Button>
      </div>
      <CopyrightNotice className="mt-6 max-w-md text-center text-xs text-muted-foreground" />
      <FeedbackButton />
    </div>
  );
}
