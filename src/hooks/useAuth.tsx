import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // If the backend never answers (paused project, offline, blocked network) getSession() can
    // wait on a token refresh for a long time. Don't leave the whole app stuck on "Loading…":
    // after a few seconds give up and let the route guard send the visitor to the sign-in page.
    const timer = window.setTimeout(() => setLoading(false), 8000);

    return () => {
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}
