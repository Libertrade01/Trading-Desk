import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUseDevTools } from "@/lib/dev-access";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ enabled: false }, { status: 401 });
  }

  return NextResponse.json({ enabled: canUseDevTools(user) });
}
