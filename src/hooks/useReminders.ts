import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsQuery, type CalendarEvent } from "@/lib/queries";
import { getPushSubscription } from "@/lib/push";

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function notificationState(): "granted" | "denied" | "default" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function fireAt(event: CalendarEvent): number | null {
  if (!event.remind_minutes) return null;
  const time = event.event_time || "08:00";
  const stamp = new Date(`${event.event_date}T${time}`);
  if (Number.isNaN(stamp.getTime())) return null;
  return stamp.getTime() - event.remind_minutes * 60_000;
}

/**
 * Polls the student's events every minute and raises a browser notification when a reminder
 * becomes due. Each event only fires once per browser. Skips itself entirely if this device
 * already has a real push subscription (see lib/push.ts) — otherwise a due reminder would fire
 * twice: once from here (only while the tab is open) and once from the server-side
 * send-reminders edge function (which covers this same device via push).
 */
export function useReminders() {
  const { data: events = [] } = useQuery({ ...eventsQuery(), refetchInterval: 5 * 60_000 });
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    let stopped = false;
    let intervalId: number | undefined;

    (async () => {
      const pushSub = await getPushSubscription();
      if (pushSub || stopped) return;

      const storeKey = "ghalib.firedReminders";
      try {
        const stored = JSON.parse(window.localStorage.getItem(storeKey) ?? "[]") as string[];
        fired.current = new Set(stored);
      } catch {
        fired.current = new Set();
      }

      const tick = () => {
        if (Notification.permission !== "granted") return;
        const now = Date.now();
        for (const event of events) {
          const at = fireAt(event);
          if (at === null || fired.current.has(event.id)) continue;
          if (at <= now && now - at < 24 * 3600_000) {
            new Notification(event.title, {
              body: [event.event_time, event.notes].filter(Boolean).join(" · "),
              tag: event.id,
            });
            fired.current.add(event.id);
            window.localStorage.setItem(storeKey, JSON.stringify([...fired.current]));
          }
        }
      };

      tick();
      intervalId = window.setInterval(tick, 60_000);
    })();

    return () => {
      stopped = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [events]);
}
