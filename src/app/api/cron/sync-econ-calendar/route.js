import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEconomicCalendar } from "@/lib/econ-calendar-api";
import {
  crossCheckEconWithApi,
  getCuratedEconEventsForRange,
} from "@/lib/econ-calendar";
import { cacheDateRange, ECON_CACHE_KEY } from "@/lib/econ-calendar-cache";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key);
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.SIFTING_API_KEY;
  const { from, to } = cacheDateRange(14);

  try {
    let apiEvents = [];
    let apiError = null;
    if (apiKey) {
      try {
        apiEvents = await fetchEconomicCalendar(from, to, apiKey);
      } catch (err) {
        apiError = err.message || "API fetch failed";
      }
    }

    const curatedEvents = getCuratedEconEventsForRange(from, to);
    const crossCheck = crossCheckEconWithApi(curatedEvents, apiEvents);

    const payload = {
      syncedAt: new Date().toISOString(),
      from,
      to,
      count: apiEvents.length,
      events: apiEvents,
      crossCheck: {
        curated: crossCheck.curatedCount,
        api: crossCheck.apiCount,
        matched: crossCheck.matched,
        curatedOnly: crossCheck.curatedOnly,
        apiOnly: crossCheck.apiOnly,
        conflictCount: crossCheck.conflictCount,
        conflicts: crossCheck.conflicts,
      },
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("app_data")
      .upsert(
        { key: ECON_CACHE_KEY, value: JSON.stringify(payload), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      syncedAt: payload.syncedAt,
      from,
      to,
      count: apiEvents.length,
      mergedCount: crossCheck.merged.length,
      conflictCount: crossCheck.conflictCount,
      apiEnabled: !!apiKey,
      provider: apiKey ? "sifting" : null,
      crossCheck: payload.crossCheck,
      ...(apiError ? { apiError } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 },
    );
  }
}
