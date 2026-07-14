import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAgeBand } from "@/lib/age-eligibility";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";

const signupSchema = z.object({
  preferredName: z.string().trim().min(1).max(32),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  legalAccepted: z.literal(true),
});

export async function POST(request) {
  let body;
  try {
    body = signupSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Check the account details and try again." }, { status: 400 });
  }

  const ageBand = getAgeBand(body.dateOfBirth);
  if (!ageBand) {
    return NextResponse.json({ error: "Enter a valid date of birth." }, { status: 400 });
  }
  if (ageBand === "under-14") {
    return NextResponse.json(
      {
        code: "AGE_RESTRICTED",
        error: "You must be at least 14 to use Libertrade.",
      },
      { status: 403 }
    );
  }

  const acceptedAt = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      emailRedirectTo: new URL("/auth/callback", request.url).toString(),
      data: {
        preferred_name: body.preferredName,
        age_band: ageBand,
        age_verified_at: acceptedAt,
        terms_version: TERMS_VERSION,
        terms_accepted_at: acceptedAt,
        privacy_version: PRIVACY_VERSION,
        privacy_acknowledged_at: acceptedAt,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ hasSession: Boolean(data.session) });
}
