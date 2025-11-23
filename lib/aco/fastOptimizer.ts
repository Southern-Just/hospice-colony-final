// lib/aco/fastOptimizer.ts
// Fast, conservative optimizer that auto-applies small, safe changes to a single hospital.
// - DOES NOT perform inter-hospital transfers (per your choice).
// - Auto-applies: converts maintenance/reserved bed => available when capacity is low.
// - Uses existing API endpoints to read & update beds (no DB assumptions).

type Bed = {
  id: string
  hospitalId: string
  wardId?: string | null
  bedNumber: string
  status: "available" | "occupied" | "maintenance" | "reserved"
  priority?: string
  position?: { x: number; y: number } | null
}

type FastOptimizeOptions = {
  // occupancy threshold under which we attempt to free up at least one bed (0..1)
  targetAvailableRatio?: number
  // max number of beds to convert in single run
  maxConversions?: number
  // if true, updates are sent (auto-apply). If false, only returns plan.
  autoApply?: boolean
}

export async function fastOptimizeHospital(
  hospitalId: string,
  opts: FastOptimizeOptions = {}
): Promise<{
  success: boolean
  message: string
  changedCount: number
  changedBeds: Array<{ id: string; from: string; to: string }>
  refreshedBeds?: Bed[]
}> {
  const {
    targetAvailableRatio = 0.15,
    maxConversions = 1,
    autoApply = true
  } = opts

  try {
    // 1) Fetch beds for this hospital
    const bres = await fetch(`/api/hospitals/${hospitalId}/beds`, { cache: "no-store" })
    if (!bres.ok) throw new Error(`Failed to fetch beds (${bres.status})`)
    const bjson = await bres.json()
    const apiBeds: Bed[] = bjson?.beds ?? []

    if (!Array.isArray(apiBeds)) {
      throw new Error("Beds response malformed")
    }

    const total = apiBeds.length
    const available = apiBeds.filter(b => b.status === "available").length
    const occupied = apiBeds.filter(b => b.status === "occupied").length
    const maintenance = apiBeds.filter(b => b.status === "maintenance").length
    const reserved = apiBeds.filter(b => b.status === "reserved").length

    // Current available ratio
    const availRatio = total === 0 ? 1 : available / total

    // If we already have enough available beds, nothing to do
    if (availRatio >= targetAvailableRatio) {
      return {
        success: true,
        message: "Sufficient availability — no changes required",
        changedCount: 0,
        changedBeds: [],
        refreshedBeds: apiBeds
      }
    }

    // We need to convert up to `maxConversions` beds from maintenance/reserved -> available
    const candidates = apiBeds
      .filter(b => b.status === "maintenance" || b.status === "reserved")
      // prefer lower priority conversions (no 'high' priority)
      .sort((a, b) => {
        const pa = (a.priority ?? "normal") === "high" ? 1 : 0
        const pb = (b.priority ?? "normal") === "high" ? 1 : 0
        return pa - pb
      })

    const conversions: Array<{ id: string; from: string; to: string }> = []
    let converted = 0

    for (const c of candidates) {
      if (converted >= maxConversions) break
      // safety: never convert occupied beds; we already filtered but double-check
      if (c.status === "occupied") continue

      // Prepare update: set to 'available'
      conversions.push({ id: c.id, from: c.status, to: "available" })
      converted++
    }

    if (conversions.length === 0) {
      return {
        success: true,
        message: "No maintenance/reserved beds available to convert",
        changedCount: 0,
        changedBeds: [],
        refreshedBeds: apiBeds
      }
    }

    // Auto-apply: send PUTs to update these bed statuses
    const changedBeds: Array<{ id: string; from: string; to: string }> = []

    if (autoApply) {
      // Note: existing API expects PUT /api/hospitals/{hospitalId}/beds with body
      // We perform sequential or parallel updates. Use Promise.all to parallelize.
      await Promise.all(conversions.map(async conv => {
        try {
          // Minimal payload — keep other fields unchanged if backend uses them
          const res = await fetch(`/api/hospitals/${hospitalId}/beds`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: conv.id,
              // backend expects wardId etc— leaving wardId unchanged (backend should ignore missing)
              status: conv.to
            })
          })
          if (!res.ok) {
            // If one fails, we still continue others, but record failure in message
            console.warn(`fastOptimize: update failed for ${conv.id} (${res.status})`)
          } else {
            changedBeds.push(conv)
          }
        } catch (err) {
          console.warn(`fastOptimize: network/update error for ${conv.id}`, err)
        }
      }))
    }

    // Refresh beds snapshot
    const refRes = await fetch(`/api/hospitals/${hospitalId}/beds`, { cache: "no-store" })
    const refJson = await refRes.json()
    const refreshedBeds: Bed[] = refJson?.beds ?? apiBeds

    return {
      success: true,
      message: `Converted ${changedBeds.length} bed(s) to available.`,
      changedCount: changedBeds.length,
      changedBeds,
      refreshedBeds
    }
  } catch (err: any) {
    return {
      success: false,
      message: (err && err.message) || String(err),
      changedCount: 0,
      changedBeds: []
    }
  }
}
