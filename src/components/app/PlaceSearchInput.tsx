import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

declare global {
  interface Window {
    google?: {
      maps: {
        places: { Autocomplete: new (input: HTMLInputElement, opts?: Record<string, unknown>) => GoogleAutocomplete };
      };
    };
  }
}

type GoogleAutocomplete = {
  addListener: (event: string, cb: () => void) => { remove: () => void };
  getPlace: () => {
    geometry?: { location?: { lat: () => number; lng: () => number } };
    formatted_address?: string;
    name?: string;
  };
};

let mapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("GOOGLE_MAPS_LOAD_FAILED"));
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
}

/**
 * A plain text input that turns into a real Google Maps place search once the Maps JS SDK
 * loads (requires `VITE_GOOGLE_MAPS_API_KEY` with the Places API enabled — see EMERGENCE.md).
 * Selecting a result reports back real lat/lng, so nobody has to type coordinates by hand.
 */
export function PlaceSearchInput({
  defaultValue,
  onSelect,
}: {
  defaultValue?: string;
  onSelect: (place: { lat: number; lng: number; address: string }) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [status, setStatus] = useState<"loading" | "ready" | "no_key" | "error">("loading");

  useEffect(() => {
    const apiKey = import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] as string | undefined;
    if (!apiKey) {
      setStatus("no_key");
      return;
    }
    let cancelled = false;
    let listener: { remove: () => void } | undefined;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current || !window.google) return;
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["geometry", "formatted_address", "name"],
        });
        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const loc = place.geometry?.location;
          if (loc) onSelect({ lat: loc.lat(), lng: loc.lng(), address: place.formatted_address || place.name || "" });
        });
        setStatus("ready");
      })
      .catch(() => setStatus("error"));

    return () => {
      cancelled = true;
      listener?.remove();
    };
    // Deliberately runs once — re-binding Autocomplete on every keystroke would leak listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "no_key") return <p className="text-xs text-muted-foreground">{t("mapsKeyMissing")}</p>;
  if (status === "error") return <p className="text-xs text-destructive">{t("mapsLoadFailed")}</p>;

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input id={inputId} ref={inputRef} defaultValue={defaultValue} placeholder={t("searchLocation")} className="ps-8" />
      {status === "loading" && (
        <Loader2 className="absolute end-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
