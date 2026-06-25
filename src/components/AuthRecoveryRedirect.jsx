"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

/**
 * Recovery emails sometimes fall back to site root (hash or PKCE code) when
 * redirect_to is not on Supabase's allow list. Send users to set-password.
 */
export default function AuthRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/reset-password" || pathname === "/forgot-password") {
      return;
    }

    const hash = window.location.hash.slice(1);
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      if (hashParams.get("type") === "recovery") {
        router.replace("/reset-password");
        return;
      }
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && pathname === "/") {
      router.replace(`/auth/recovery?code=${encodeURIComponent(code)}`);
      return;
    }

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "PASSWORD_RECOVERY" &&
        window.location.pathname !== "/reset-password"
      ) {
        router.replace("/reset-password");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  return null;
}
