import { createFileRoute, Link } from "@tanstack/react-router";
import { isMissingSchemaError } from "@/lib/db-errors";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  FileOutput,
  GraduationCap,
  Loader2,
  MapPin,
  RefreshCw,
  Award,
  BookOpenCheck,
  Palette,
  Sunrise,
  TrendingUp,
  UserRound,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlaceSearchInput } from "@/components/app/PlaceSearchInput";
import { ResetAccountCard } from "@/components/app/ResetAccountCard";
import { NotificationSettings } from "@/components/app/NotificationSettings";
import { AchievementsBadges } from "@/components/app/AchievementsBadges";
import { AccentPicker, ThemeModeToggle } from "@/components/app/ThemeControls";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Academic Profile — Ghalib" },
      {
        name: "description",
        content: "Manage your major, current term, GPA and completed credits.",
      },
      { property: "og:title", content: "Academic Profile — Ghalib" },
      {
        property: "og:description",
        content: "Manage your major, current term, GPA and completed credits.",
      },
    ],
  }),
  component: ProfilePage,
});

const FALLBACK_TIMEZONES = [
  "Asia/Kuwait",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Qatar",
  "Asia/Bahrain",
  "Africa/Cairo",
  "Europe/London",
  "America/New_York",
  "UTC",
];

function listTimezones(): string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf;
    const zones = supported?.("timeZone");
    if (zones?.length) return zones;
  } catch {
    /* fall through */
  }
  return FALLBACK_TIMEZONES;
}

const TIMEZONES = listTimezones();

function StatBlock({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-card px-4 py-4 text-center">
      <Icon className={cn("size-4", highlight ? "text-accent" : "text-muted-foreground")} />
      <p className={cn("text-2xl font-bold tabular-nums", highlight && "text-accent")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("panel p-6", className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon className="size-4.5" />
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ProfilePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    major: "",
    current_term: "",
    home_lat: "",
    home_lng: "",
    home_address: "",
    university_lat: "",
    university_lng: "",
    university_address: "",
    commute_mode: "driving",
    briefing_enabled: false,
    briefing_lead_minutes: "60",
    briefing_buffer_minutes: "10",
    timezone: "Asia/Kuwait",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      major: profile.major ?? "",
      current_term: profile.current_term ?? "",
      home_lat: profile.home_lat?.toString() ?? "",
      home_lng: profile.home_lng?.toString() ?? "",
      home_address: profile.home_address ?? "",
      university_lat: profile.university_lat?.toString() ?? "",
      university_lng: profile.university_lng?.toString() ?? "",
      university_address: profile.university_address ?? "",
      commute_mode: profile.commute_mode ?? "driving",
      briefing_enabled: profile.briefing_enabled ?? false,
      briefing_lead_minutes: profile.briefing_lead_minutes?.toString() ?? "60",
      briefing_buffer_minutes: profile.briefing_buffer_minutes?.toString() ?? "10",
      timezone: profile.timezone ?? "Asia/Kuwait",
    });
  }, [profile]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("locationUnsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((s) => ({
          ...s,
          home_lat: pos.coords.latitude.toFixed(6),
          home_lng: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        toast.error(t("locationFailed"));
        setLocating(false);
      },
    );
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          major: form.major || null,
          current_term: form.current_term || null,
          home_lat: form.home_lat ? Number(form.home_lat) : null,
          home_lng: form.home_lng ? Number(form.home_lng) : null,
          home_address: form.home_address || null,
          university_lat: form.university_lat ? Number(form.university_lat) : null,
          university_lng: form.university_lng ? Number(form.university_lng) : null,
          university_address: form.university_address || null,
          commute_mode: form.commute_mode,
          briefing_enabled: form.briefing_enabled,
          briefing_lead_minutes: form.briefing_lead_minutes
            ? Number(form.briefing_lead_minutes)
            : 60,
          briefing_buffer_minutes: form.briefing_buffer_minutes
            ? Number(form.briefing_buffer_minutes)
            : 10,
          timezone: form.timezone || "Asia/Kuwait",
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(t("saved"));
    },
    onError: (e: Error) =>
      toast.error(isMissingSchemaError(e) ? t("migrationMissingHint") : t("saveFailed")),
  });

  const fields: { key: keyof typeof form; label: string; type?: string; step?: string }[] = [
    { key: "full_name", label: t("fullName") },
    { key: "major", label: t("major") },
    { key: "current_term", label: t("currentTerm") },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Hero header */}
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
              <UserRound className="size-6" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold">
                {profile?.full_name || t("profile")}
              </h1>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/reimport-plan"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
            >
              <RefreshCw className="size-4" />
              {t("reimportTitle")}
            </Link>
            <Link
              to="/plan-print"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
            >
              <FileOutput className="size-4" />
              {t("exportPlan")}
            </Link>
            <Link
              to="/transcript"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
            >
              <GraduationCap className="size-4" />
              {t("exportTranscript")}
            </Link>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-px bg-border">
          <StatBlock
            icon={Award}
            label={t("overallGpa")}
            value={profile?.overall_gpa?.toFixed(2) ?? "—"}
            highlight
          />
          <StatBlock
            icon={TrendingUp}
            label={t("semesterGpa")}
            value={profile?.semester_gpa?.toFixed(2) ?? "—"}
          />
          <StatBlock
            icon={BookOpenCheck}
            label={t("totalCredits")}
            value={String(profile?.total_credits ?? 0)}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("gpaReadOnlyHint")}</p>

      {/* Basic info */}
      <SectionCard icon={UserRound} title={t("basicInfoTitle")} className="mt-6">
        <div className="space-y-5">
          {fields.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type={f.type ?? "text"}
                step={f.step}
                value={String(form[f.key] ?? "")}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label>{t("timezone")}</Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => setForm((s) => ({ ...s, timezone: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("timezoneHint")}</p>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {t("save")}
          </Button>
        </div>
      </SectionCard>

      {/* Appearance: light/dark + accent colour, including a fully custom colour */}
      <SectionCard
        icon={Palette}
        title={t("appearance")}
        className="mt-6"
        action={<ThemeModeToggle />}
      >
        <AccentPicker />
      </SectionCard>

      {/* Every reminder control in one place */}
      <NotificationSettings userId={user?.id} />

      {/* Achievements & badges */}
      <SectionCard
        icon={Award}
        title={t("achievementsTitle")}
        description={t("achievementsHint")}
        className="mt-6"
      >
        <AchievementsBadges />
      </SectionCard>

      {/* Morning commute briefing */}
      <SectionCard
        icon={Sunrise}
        title={t("briefingTitle")}
        className="mt-6"
        description={t("briefingHint")}
        action={
          <Switch
            checked={form.briefing_enabled}
            onCheckedChange={(checked) => {
              if (checked && (!form.home_lat || !form.university_lat)) {
                toast.error(t("briefingNeedsLocation"));
                return;
              }
              if (
                checked &&
                (typeof Notification === "undefined" || Notification.permission !== "granted")
              ) {
                toast.error(t("briefingNeedsPush"));
                return;
              }

              setForm((s) => ({ ...s, briefing_enabled: checked }));
            }}
          />
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-border p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="size-4 text-accent" />
                {t("homeLocation")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={locating}
                onClick={useMyLocation}
              >
                {locating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MapPin className="size-3.5" />
                )}
                {t("useMyLocation")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {form.home_lat && form.home_lng
                  ? `${form.home_lat}, ${form.home_lng}`
                  : t("notSet")}
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-border p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="size-4 text-accent" />
                {t("universityLocation")}
              </p>
              <PlaceSearchInput
                defaultValue={form.university_address}
                onSelect={(place) =>
                  setForm((s) => ({
                    ...s,
                    university_lat: place.lat.toFixed(6),
                    university_lng: place.lng.toFixed(6),
                    university_address: place.address,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {form.university_lat && form.university_lng
                  ? form.university_address || t("locationSet")
                  : t("notSet")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("commuteMode")}</Label>
              <Select
                value={form.commute_mode}
                onValueChange={(v) => setForm((s) => ({ ...s, commute_mode: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driving">{t("driving")}</SelectItem>
                  <SelectItem value="walking">{t("walking")}</SelectItem>
                  <SelectItem value="transit">{t("transit")}</SelectItem>
                  <SelectItem value="bicycling">{t("bicycling")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("briefingLeadMinutes")}</Label>
              <Input
                type="number"
                min={15}
                value={form.briefing_lead_minutes}
                onChange={(e) => setForm((s) => ({ ...s, briefing_lead_minutes: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("briefingBufferMinutes")}</Label>
              <Input
                type="number"
                min={0}
                value={form.briefing_buffer_minutes}
                onChange={(e) =>
                  setForm((s) => ({ ...s, briefing_buffer_minutes: e.target.value }))
                }
              />
            </div>
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {t("save")}
          </Button>
        </div>
      </SectionCard>

      <ResetAccountCard />
    </div>
  );
}
