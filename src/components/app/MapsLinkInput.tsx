import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { resolveMapsLink } from "@/lib/maps-link.functions";

/** Pulls lat/lng out of a full Google Maps URL. Returns null when no coordinates exist. */
export function parseMapsUrl(url: string): { lat: number; lng: number } | null {
  // Patterns: @lat,lng | !3dlat!4dlng | q=lat,lng | ll=lat,lng | center=lat,lng
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|center|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180)
        return { lat, lng };
    }
  }
  return null;
}

/**
 * Paste-a-Google-Maps-link field: extracts the place's coordinates so the user never has to
 * search or type numbers. Short links (maps.app.goo.gl) are resolved server-side first.
 */
export function MapsLinkInput({
  onSelect,
}: {
  onSelect: (place: { lat: number; lng: number; address: string }) => void;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const extract = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      let coords = parseMapsUrl(trimmed);
      let finalUrl = trimmed;
      if (!coords) {
        const { finalUrl: resolved } = await resolveMapsLink({ data: trimmed });
        finalUrl = resolved;
        coords = parseMapsUrl(resolved);
      }
      if (!coords) {
        toast.error(t("invalidMapsLink"));
        return;
      }
      onSelect({
        lat: coords.lat,
        lng: coords.lng,
        address: finalUrl.startsWith("http") ? "" : finalUrl,
      });
      setUrl("");
      toast.success(t("mapsLinkExtracted"));
    } catch {
      toast.error(t("invalidMapsLink"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Link2 className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void extract();
            }
          }}
          placeholder={t("pasteMapsLink")}
          className="ps-8"
          dir="ltr"
        />
      </div>
      <Button type="button" variant="outline" size="sm" disabled={busy || !url.trim()} onClick={() => void extract()}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : t("extractFromLink")}
      </Button>
    </div>
  );
}
