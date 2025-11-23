import { db } from "@/lib/database";
import { acoRuns, acoRunEvents } from "@/lib/database/schema";

export async function logAcoRunStart(hospitalId: string, userId?: string) {
  const [run] = await db
    .insert(acoRuns)
    .values({
      hospitalId,
      initiatorUserId: userId ?? null,
      status: "running",
      startedAt: new Date()
    })
    .returning();

  return run;
}

export async function logAcoRunEvent(runId: string, eventType: string, message: string, metadata?: any) {
  await db.insert(acoRunEvents).values({
    runId,
    eventType,
    message,
    metadata: metadata ?? {},
  });
}

export async function logAcoRunFinish(runId: string, summary: any) {
  await db
    .update(acoRuns)
    .set({
      finishedAt: new Date(),
      durationMs: summary.durationMs ?? null,
      iterations: summary.iterations ?? null,
      bestScore: summary.bestScore ?? null,
      reservedSlot: summary.reservedSlot ?? null,
      details: summary.details ?? {},
      status: "completed"
    })
    .where(acoRuns.id.eq(runId));
}
