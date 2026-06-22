import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withUserTradesQuery } from "@/lib/trades-query";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const sessionKeys = (date) => [
  `premarket-checkin-${date}`,
  `daily-plan-${date}`,
  `postmarket-review-${date}`,
];

export async function DELETE(_request, { params }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await params;
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const keys = sessionKeys(date);

    const { error: appError } = await supabase
      .from("app_data")
      .delete()
      .eq("user_id", user.id)
      .in("key", keys);
    if (appError) throw new Error(appError.message);

    const { error: tradesError } = await withUserTradesQuery(
      supabase.from("trades").delete(),
      user.id
    ).eq("date", date);
    if (tradesError) throw new Error(tradesError.message);

    return NextResponse.json({ ok: true, date });
  } catch (err) {
    console.error("sessions/delete:", err);
    return NextResponse.json(
      { error: err.message || "Delete failed" },
      { status: 500 }
    );
  }
}
