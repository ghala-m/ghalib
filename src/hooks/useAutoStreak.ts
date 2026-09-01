import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { coursesQuery, logStreakToday, meetingDayIndex, meetingsOf, profileQuery } from "@/lib/queries";
import { distanceMeters } from "@/lib/streak";
import { useAuth } from "@/hooks/useAuth";

const CAMPUS_RADIUS_METERS = 300;
const CHECK_INTERVAL_MS = 15 * 60_000;

function hhmmToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * While the app is open during a scheduled class time, checks once every 15 minutes whether the
 * student's device is physically near the university (via geolocation) and, if so, logs today's
 * streak automatically — on top of the manual "log today" button, not instead of it.
 *
 * Foreground-only by design: browsers don't allow reliable background geolocation from a web
 * app, so this only runs while some Ghalib page is open (most naturally the dashboard) during
 * class hours. Manual logging remains the reliable fallback for the rest of the day.
 */
export function useAutoStreak() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: courses = [] } = useQuery(coursesQuery());
  const loggedToday = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !profile?.university_lat || !profile?.university_lng) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const check = () => {
      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      if (loggedToday.current === todayIso) return; // already auto-logged this session today

      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const dow = now.getDay();
      const hasClassNow = courses
        .filter((c) => !c.archived && c.status === "current")
        .some((c) =>
          meetingsOf(c).some((m) => {
            if (meetingDayIndex(m.day) !== dow || !m.start_time) return false;
            const start = hhmmToMinutes(m.start_time);
            const end = m.end_time ? hhmmToMinutes(m.end_time) : start + 60;
            return nowMinutes >= start - 15 && nowMinutes <= end + 15; // small buffer either side
          }),
        );
      if (!hasClassNow) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const dist = distanceMeters(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            { lat: profile.university_lat!, lng: profile.university_lng! },
          );
          if (dist <= CAMPUS_RADIUS_METERS) {
            loggedToday.current = todayIso;
            logStreakToday(user.id).then(() => qc.invalidateQueries({ queryKey: ["streak"] }));
          }
        },
        () => {
          /* permission denied or unavailable — silently skip, manual logging still works */
        },
        { maximumAge: 10 * 60_000, timeout: 15_000 },
      );
    };

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [user, profile?.university_lat, profile?.university_lng, courses, qc]);
}
