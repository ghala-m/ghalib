import { createFileRoute, Link } from "@tanstack/react-router";
import { isMissingSchemaError } from "@/lib/db-errors";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, FileOutput, Loader2, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlaceSearchInput } from "@/components/app/PlaceSearchInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Academic Profile — Ghalib" },
      { name: "description", content: "Manage your major, current term, GPA and completed credits." },
      { property: "og:title", content: "Academic Profile — Ghalib" },
      { property: "og:description", content: "Manage your major, current term, GPA and completed credits." },
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
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    const zones = supported?.("timeZone");
    if (zones?.length) return zones;
  } catch {
    /* fall through */
  }
  return FALLBACK_TIMEZONES;
}

const TIMEZONES = listTimezones();

function ProfilePage() {

  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const push = usePushNotifications(user?.id);
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
          briefing_lead_minutes: form.briefing_lead_minutes ? Number(form.briefing_lead_minutes) : 60,
          briefing_buffer_minutes: form.briefing_buffer_minutes ? Number(form.briefing_buffer_minutes) : 10,
          timezone: form.timezone || "Asia/Kuwait",

        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(t("saved"));
    },
    onError: (e: Error) => toast.error(isMissingSchemaError(e) ? t("migrationMissingHint") : t("saveFailed")),
  });

  const fields: { key: keyof typeof form; label: string; type?: string; step?: string }[] = [
    { key: "full_name", label: t("fullName") },
    { key: "major", label: t("major") },
    { key: "current_term", label: t("currentTerm") },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold">{t("profile")}</h1>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <div className="flex items-center gap-2">
          <Link
            to="/reimport-plan"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <RefreshCw className="size-4" />
            {t("reimportTitle")}
          </Link>
          <Link
            to="/plan-print"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <FileOutput className="size-4" />
            {t("exportPlan")}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="panel p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">{profile?.overall_gpa?.toFixed(2) ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{t("overallGpa")}</p>
        </div>
        <div className="panel p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">{profile?.semester_gpa?.toFixed(2) ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{t("semesterGpa")}</p>
        </div>
        <div className="panel p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">{profile?.total_credits ?? 0}</p>
          <p className="text-xs text-muted-foreground">{t("totalCredits")}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("gpaReadOnlyHint")}</p>

      <div className="panel mt-4 space-y-5 p-6">
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
          <Select value={form.timezone} onValueChange={(v) => setForm((s) => ({ ...s, timezone: v }))}>
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

      {/* Real push notifications */}
      <div className="panel mt-6 p-6">
        <h2 className="font-semibold">{t("pushNotifTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("pushNotifHint")}</p>
        {!push.supported ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("pushUnsupported")}</p>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant={push.subscribed ? "outline" : "default"}
              disabled={push.checking || push.busy}
              onClick={async () => {
                if (push.subscribed) {
                  await push.disable();
                  return;
                }
                const result = await push.enable();
                if (result.ok) {
                  toast.success(t("pushActive"));
                } else if (result.reason === "missing_vapid_key") {
                  toast.error(t("pushKeyMissing"));
                } else if (result.reason === "permission_denied") {
                  toast.error(t("pushPermissionDenied"));
                } else if (result.reason === "unsupported") {
                  toast.error(t("pushUnsupported"));
                } else {
                  toast.error(t("saveFailed"));
                }
              }}
            >
              {push.busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : push.subscribed ? (
                <BellOff className="size-4" />
              ) : (
                <Bell className="size-4" />
              )}
              {push.subscribed ? t("pushDisable") : t("pushEnable")}
            </Button>
            {push.subscribed && <span className="text-xs text-cat-general">{t("pushActive")}</span>}
          </div>
        )}
      </div>

      {/* Morning commute briefing */}
      <div className="panel mt-6 space-y-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{t("briefingTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("briefingHint")}</p>
          </div>
          <Switch
            checked={form.briefing_enabled}
            onCheckedChange={(checked) => {
              if (checked && (!form.home_lat || !form.university_lat)) {
                toast.error(t("briefingNeedsLocation"));
                return;
              }
              if (checked && !push.subscribed) {
                toast.error(t("briefingNeedsPush"));
                return;
              }
              setForm((s) => ({ ...s, briefing_enabled: checked }));
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-border p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="size-4 text-accent" />
              {t("homeLocation")}
            </p>
            <Button type="button" variant="outline" size="sm" disabled={locating} onClick={useMyLocation}>
              {locating ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
              {t("useMyLocation")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {form.home_lat && form.home_lng ? `${form.home_lat}, ${form.home_lng}` : t("notSet")}
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
              {form.university_lat && form.university_lng ? form.university_address || t("locationSet") : t("notSet")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{t("commuteMode")}</Label>
            <Select value={form.commute_mode} onValueChange={(v) => setForm((s) => ({ ...s, commute_mode: v }))}>
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
              onChange={(e) => setForm((s) => ({ ...s, briefing_buffer_minutes: e.target.value }))}
            />
          </div>
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
