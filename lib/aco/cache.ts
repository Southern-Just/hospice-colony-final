import { UIBed } from "./acoSimulator"

const KEY = "hospice_colony_beds_cache_v1"

export function saveBedCache(hospitalId: string, beds: UIBed[]) {
  const cache = { hospitalId, beds, timestamp: Date.now() }
  localStorage.setItem(KEY, JSON.stringify(cache))
}

export function loadBedCache(hospitalId: string): UIBed[] | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  const parsed = JSON.parse(raw)
  if (parsed.hospitalId !== hospitalId) return null
  return parsed.beds ?? null
}
