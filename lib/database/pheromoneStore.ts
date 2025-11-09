import { db } from "./db";
import { pheromones } from "./schema";
import { eq } from "drizzle-orm";

export async function loadPheromones(): Promise<Map<string, number>> {
  const rows = await db.select().from(pheromones);
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(`${row.fromBedId}-${row.toBedId}`, row.value);
  }
  return map;
}

export async function getPheromone(fromBedId: string, toBedId: string): Promise<number> {
  const rows = await db
    .select()
    .from(pheromones)
    .where(eq(pheromones.fromBedId, fromBedId))
    .where(eq(pheromones.toBedId, toBedId));
  return rows.length > 0 ? rows[0].value : 1.0;
}

export async function savePheromone(fromBedId: string, toBedId: string, value: number) {
  await db
    .insert(pheromones)
    .values({ fromBedId, toBedId, value })
    .onConflictDoUpdate({
      target: [pheromones.fromBedId, pheromones.toBedId],
      set: { value }
    });
}

export async function evaporatePheromones(rate: number) {
  const rows = await db.select().from(pheromones);
  for (const row of rows) {
    const newValue = row.value * rate;
    await db
      .update(pheromones)
      .set({ value: newValue })
      .where(eq(pheromones.fromBedId, row.fromBedId))
      .where(eq(pheromones.toBedId, row.toBedId));
  }
}
