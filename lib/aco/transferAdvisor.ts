import { db } from "@/lib/database/db"
import { hospitals, beds } from "@/lib/database/schema"
import { eq, and } from "drizzle-orm"

export async function getTransferSuggestions(hid: string) {
  const allHospitals = await db.select().from(hospitals)
  const userHospital = allHospitals.find(h => h.id === hid)
  if (!userHospital) return { success: false, suggestions: [] }

  const userBeds = await db.select().from(beds).where(eq(beds.hospitalId, hid))
  const occupied = userBeds.filter(b => b.status === "occupied")
  if (occupied.length === 0) return { success: true, suggestions: [] }

  const suggestions = []

  for (const h of allHospitals) {
    if (h.id === hid) continue
    const hBeds = await db.select().from(beds).where(eq(beds.hospitalId, h.id))
    const free = hBeds.filter(b => b.status === "available")
    if (free.length === 0) continue

    suggestions.push({
      hospitalId: h.id,
      hospitalName: h.name,
      free: free.length,
      score: free.length / h.totalBeds
    })
  }

  suggestions.sort((a, b) => b.score - a.score)

  return { success: true, suggestions }
}

export async function applySuggestedTransfer(fromHospitalId: string, toHospitalId: string, count: number) {
  const fromBeds = await db.select().from(beds).where(and(eq(beds.hospitalId, fromHospitalId), eq(beds.status, "occupied")))
  const toBeds = await db.select().from(beds).where(and(eq(beds.hospitalId, toHospitalId), eq(beds.status, "available")))

  const usedFrom = fromBeds.slice(0, count)
  const usedTo = toBeds.slice(0, count)

  for (let i = 0; i < usedFrom.length; i++) {
    await db.update(beds).set({ status: "available" }).where(eq(beds.id, usedFrom[i].id))
    await db.update(beds).set({ status: "occupied" }).where(eq(beds.id, usedTo[i].id))
  }

  const fromH = await db.select().from(hospitals).where(eq(hospitals.id, fromHospitalId))
  const toH = await db.select().from(hospitals).where(eq(hospitals.id, toHospitalId))

  await db.update(hospitals).set({
    availableBeds: (fromH[0].availableBeds ?? 0) + count,
    occupiedBeds: (fromH[0].occupiedBeds ?? 0) - count
  }).where(eq(hospitals.id, fromHospitalId))

  await db.update(hospitals).set({
    availableBeds: (toH[0].availableBeds ?? 0) - count,
    occupiedBeds: (toH[0].occupiedBeds ?? 0) + count
  }).where(eq(hospitals.id, toHospitalId))

  return { success: true }
}
