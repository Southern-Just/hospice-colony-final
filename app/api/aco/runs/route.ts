import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { acoRuns } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hospitalId = searchParams.get("hospitalId");

  let rows;
  if (hospitalId) {
    rows = await db
      .select()
      .from(acoRuns)
      .where(eq(acoRuns.hospitalId, hospitalId))
      .orderBy(acoRuns.startedAt);
  } else {
    rows = await db.select().from(acoRuns).orderBy(acoRuns.startedAt);
  }

  return NextResponse.json({ runs: rows });
}
