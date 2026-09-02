import { useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, CalendarDays, CalendarRange, Calculator, CheckCircle2, ChevronDown, LogOut, Menu, MessageSquareHeart, ScrollText, Search, Sparkles, UserRound, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { blockedByAlternative, coursesQuery, matchesCourse, type CourseStatus } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LangToggle } from "@/components/LangToggle";
import { AddCourseDialog } from "@/components/app/AddCourseDialog";
import { cn } from "@/lib/utils";

const groups: { status: CourseStatus; icon: typeof BookMarked }[] = [
  { status: "current", icon: BookMarked },
  { status: "completed", icon: CheckCircle2 },
  { status: "future", icon: CalendarRange },
];

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <SidebarInner />
    </aside>
  );
}

/** Hamburger + slide-over sidebar, shown only on small screens. */
export function MobileNav() {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("openMenu")}>
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side={dir === "rtl" ? "right" : "left"}
          className="w-[85vw] max-w-80 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">{t("openMenu")}</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarInner onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <ScrollText className="size-4" />
        </div>
        <p className="font-display text-base font-bold">{t("appName")}</p>
      </div>
    </div>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<CourseStatus, boolean>>({ current: false, completed: false, future: true });
  const { data: courses = [] } = useQuery(coursesQuery());
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses
      .filter((c) => !c.archived)
      .filter((c) => matchesCourse(c, q));
  }, [courses, search]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <>
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <ScrollText className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base leading-tight font-bold">{t("appName")}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">{t("tagline")}</p>
        </div>
      </div>

      <nav className="space-y-1 px-3">
        <SideLink to="/dashboard" active={pathname === "/dashboard"} icon={Sparkles} label={t("dashboard")} onNavigate={onNavigate} />
        <SideLink to="/calendar" active={pathname === "/calendar"} icon={CalendarDays} label={t("calendar")} onNavigate={onNavigate} />
        <SideLink to="/advisor" active={pathname === "/advisor"} icon={MessageSquareHeart} label={t("advisor")} onNavigate={onNavigate} />
        <SideLink to="/tools" active={pathname === "/tools"} icon={Wrench} label={t("studyTools")} onNavigate={onNavigate} />
        <SideLink to="/gpa-planner" active={pathname === "/gpa-planner"} icon={Calculator} label={t("gpaPlanner")} onNavigate={onNavigate} />
        <SideLink to="/profile" active={pathname === "/profile"} icon={UserRound} label={t("profile")} onNavigate={onNavigate} />
      </nav>

      <div className="px-3 py-4">
        <AddCourseDialog />
      </div>

      <div className="px-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-sidebar-foreground/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchCourses")}
            aria-label={t("searchCourses")}
            className="border-sidebar-border bg-sidebar-accent ps-9 text-sidebar-foreground placeholder:text-sidebar-foreground/50"
          />
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map(({ status, icon: Icon }) => {
          const list = filtered.filter((c) => c.status === status);
          const isCollapsed = collapsed[status] && !search.trim();
          return (
            <section key={status}>
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => setCollapsed((s) => ({ ...s, [status]: !s[status] }))}
                className="flex w-full items-center gap-2 rounded-lg px-2 pb-2 text-xs font-semibold tracking-wide text-sidebar-foreground/60 uppercase transition-colors hover:text-sidebar-foreground"
              >
                <Icon className="size-3.5" />
                {t(status)}
                <span className="ms-auto flex items-center gap-1.5">
                  {list.length}
                  <ChevronDown className={cn("size-3.5 transition-transform", isCollapsed && "-rotate-90")} />
                </span>
              </button>
              {!isCollapsed && (
                <ul className="space-y-0.5">
                  {list.map((c) => (
                    <li key={c.id}>
                      <Link
                        to="/courses/$courseId"
                        params={{ courseId: c.id }}
                        onClick={onNavigate}
                        className={cn(
                          "block truncate rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                          pathname === `/courses/${c.id}` && "bg-sidebar-accent font-medium",
                          blockedByAlternative(c, courses) && "text-sidebar-foreground/45 line-through",
                        )}
                        title={blockedByAlternative(c, courses) ? t("blockedByAlt") : undefined}
                      >
                        {c.code ? <span className="text-sidebar-foreground/60">{c.code} · </span> : null}
                        {c.name}
                        {c.is_retake ? (
                          <span className="ms-2 rounded bg-sidebar-primary/20 px-1.5 py-0.5 text-[10px] text-sidebar-primary">
                            {t("retakeBadge")}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-sidebar-border px-3 py-3">
        <LangToggle />
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="size-4" />
          {t("signOut")}
        </Button>
      </div>
    </>
  );
}

function SideLink({
  to,
  active,
  icon: Icon,
  label,
  onNavigate,
}: {
  to: "/dashboard" | "/profile" | "/calendar" | "/advisor" | "/tools" | "/gpa-planner";
  active: boolean;
  icon: typeof BookMarked;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
        active && "bg-sidebar-accent font-medium",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
