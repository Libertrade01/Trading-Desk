import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Password-reset email links land here (no query params — matches Supabase redirect allow list). */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "recovery";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password?verified=1`);
    }
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password?verified=1`);
    }
  }

  return NextResponse.redirect(`${origin}/forgot-password?error=invalid`);
}
