import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { migrateFounderDataForUser } from "@/lib/founder-migration";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const next = searchParams.get("next") ?? "/home";
  const type = searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await migrateFounderDataForUser(user);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await migrateFounderDataForUser(user);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
