import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type AdminState = "loading" | "admin" | "not_admin" | "unauthenticated";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AdminState>("loading");

  useEffect(() => {
    if (authLoading) {
      setState("loading");
      return;
    }

    if (!user) {
      setState("unauthenticated");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn("[useAdmin] role check failed:", error);
          setState("not_admin");
          return;
        }

        setState(data ? "admin" : "not_admin");
      } catch (e) {
        if (cancelled) return;
        console.warn("[useAdmin] role check error:", e);
        setState("not_admin");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return {
    isAdmin: state === "admin",
    isLoading: state === "loading" || authLoading,
    isUnauthenticated: state === "unauthenticated",
  };
}
