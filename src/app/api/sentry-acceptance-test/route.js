import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function POST(request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("x-libertrade-test-secret");
  if (!expected || supplied !== expected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const eventId = Sentry.captureException(new Error("Libertrade production monitoring acceptance test"), {
    tags: { acceptance_test: "sentry-production" },
  });
  await Sentry.flush(3000);
  return NextResponse.json({ captured: Boolean(eventId) });
}
