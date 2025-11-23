import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { acoRuns, acoRunEvents } from "@/lib/database/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hospitalId = searchParams.get("hospitalId");

  let runs;

  if (hospitalId) {
    runs = await db
      .select()
      .from(acoRuns)
      .where(eq(acoRuns.hospitalId, hospitalId))
      .orderBy(acoRuns.startedAt);
  } else {
    runs = await db
      .select()
      .from(acoRuns)
      .orderBy(acoRuns.startedAt);
  }

  const runIds = runs.map(r => r.id);

  const events = runIds.length
    ? await db.select().from(acoRunEvents).where(inArray(acoRunEvents.runId, runIds))
    : [];

  return NextResponse.json({ runs, events });
}
