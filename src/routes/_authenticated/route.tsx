import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { profileQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { AppSidebar } from "@/components/app/AppSidebar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { dir, t } = useI18n();

  const { data: profile } = useQuery(profileQuery(user?.id));
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile && !profile.onboarding_completed && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [profile, pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  const bare = pathname === "/onboarding" || pathname === "/plan-print";

  return (
    <div dir={dir} className="flex min-h-screen bg-background">
      {bare ? null : <AppSidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        {bare ? null : <MobileNav />}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

