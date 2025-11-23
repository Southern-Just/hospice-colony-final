const KEY = "aco_simulation_history"

interface AcoHistory {
  count: number
  lastTimestamp: string | null
}

export function loadAcoHistory(hospitalId: string): AcoHistory {
  try {
    const raw = localStorage.getItem(`${KEY}_${hospitalId}`)
    if (!raw) return { count: 0, lastTimestamp: null }
    return JSON.parse(raw)
  } catch {
    return { count: 0, lastTimestamp: null }
  }
}

export function saveAcoHistory(hospitalId: string, history: AcoHistory) {
  localStorage.setItem(`${KEY}_${hospitalId}`, JSON.stringify(history))
}
