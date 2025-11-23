import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { acoRuns, acoRunEvents } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(_: Request, { params }: { params: { hospitalId: string } }) {
  const { hospitalId } = params;

  const runs = await db
    .select()
    .from(acoRuns)
    .where(eq(acoRuns.hospitalId, hospitalId))
    .orderBy(acoRuns.startedAt);

  return NextResponse.json({ runs });
}

export async function POST(req: Request, { params }: { params: { hospitalId: string } }) {
  const data = await req.json();
  const { hospitalId } = params;

  const inserted = await db
    .insert(acoRuns)
    .values({
      hospitalId,
      initiatorUserId: data.initiatorUserId ?? null,
      iterations: data.iterations ?? 0,
      durationMs: data.durationMs ?? null,
      bestScore: data.bestScore ?? null,
      reservedSlot: data.reservedSlot ?? null,
      details: data.details ?? {},
      status: data.status ?? "completed",
    })
    .returning();

  return NextResponse.json({ run: inserted[0] });
}
