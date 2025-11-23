export type BedStatus = "available" | "occupied" | "maintenance" | "reserved"

export type UIBed = {
  id: string
  bedNumber: string
  ward: string
  status: BedStatus
  positionIndex: number
  priority: string
  hospitalId: string
}

export interface ACOParams {
  hospitalId: string
  beds: UIBed[]
  gridCols?: number
  gridRows?: number
  ants?: number
  iterations?: number
  alpha?: number
  beta?: number
  evaporation?: number
  reinforcement?: number
  randomTopKFreeSlot?: number
}

export function runHeavyACO({
  hospitalId,
  beds,
  gridCols = 8,
  gridRows = 8,
  ants = 60,
  iterations = 30,
  alpha = 1,
  beta = 2,
  evaporation = 0.85,
  reinforcement = 6,
  randomTopKFreeSlot = 5
}: ACOParams) {
  const GRID_SIZE = gridCols * gridRows
  const DOOR_ROW = gridRows - 1
  const DOOR_RANGE_START = DOOR_ROW * gridCols
  const doorPositions = new Set(Array.from({ length: gridCols }, (_, i) => DOOR_RANGE_START + i))

  const cloneBeds = beds.map(b => ({ ...b }))

  const allPositions = Array.from({ length: GRID_SIZE }, (_, i) => i)
  const validPositions = allPositions.filter(i => !doorPositions.has(i))

  const posToXY = (p: number) => ({ x: p % gridCols, y: Math.floor(p / gridCols) })
  const distance = (a: number, b: number) => {
    const A = posToXY(a), B = posToXY(b)
    return Math.hypot(A.x - B.x, A.y - B.y)
  }

  const wardCenters: Record<string, { x: number; y: number }> = {}
  const wardCounts: Record<string, number> = {}

  for (const b of cloneBeds) {
    if (b.positionIndex >= 0) {
      const { x, y } = posToXY(b.positionIndex)
      if (!wardCenters[b.ward]) wardCenters[b.ward] = { x: 0, y: 0 }
      wardCenters[b.ward].x += x
      wardCenters[b.ward].y += y
      wardCounts[b.ward] = (wardCounts[b.ward] || 0) + 1
    }
  }

  for (const w of Object.keys(wardCenters)) {
    wardCenters[w].x /= wardCounts[w]
    wardCenters[w].y /= wardCounts[w]
  }

  const gridCenterPos = Math.floor(GRID_SIZE / 2)
  const wardCenterPos = (ward: string) => {
    if (!wardCenters[ward]) return gridCenterPos
    const c = wardCenters[ward]
    return Math.min(GRID_SIZE - 1, Math.max(0, Math.round(c.y) * gridCols + Math.round(c.x)))
  }

  const statusOrder: Record<BedStatus, number> = {
    occupied: 1,
    reserved: 2,
    available: 3,
    maintenance: 4
  }

  const availablePositionsCount = validPositions.length - 1
  let workingBeds = [...cloneBeds]
  let forcedUnplaced: UIBed | null = null

  if (workingBeds.length > validPositions.length - 0) {
    workingBeds.sort((a, b) => {
      const pa = statusOrder[a.status]
      const pb = statusOrder[b.status]
      return pb - pa
    })
    forcedUnplaced = workingBeds.pop() || null
  }

  const pheromones = Array(GRID_SIZE).fill(1)
  for (const p of validPositions) pheromones[p] = 1 + Math.random() * 0.1

  const computeFlexibilityScoreForPos = (pos: number) => {
    const xy = posToXY(pos)
    let localCount = 0
    for (const b of cloneBeds) {
      if (b.positionIndex >= 0 && distance(pos, b.positionIndex) <= 1.5) localCount++
    }
    let avgWardDist = 0
    let wCount = 0
    for (const w of Object.keys(wardCenters)) {
      avgWardDist += distance(pos, wardCenterPos(w))
      wCount++
    }
    avgWardDist = wCount ? avgWardDist / wCount : distance(pos, gridCenterPos)
    const pher = pheromones[pos]
    const doorDist = Math.min(...Array.from(doorPositions).map(d => distance(pos, d)))
    return (1 / (1 + localCount)) * 2 + avgWardDist * 0.25 + pher * 0.5 + (1 / (1 + doorDist)) * 0.5
  }

  const candidateScores = validPositions.map(p => ({ p, s: computeFlexibilityScoreForPos(p) }))
  candidateScores.sort((a, b) => b.s - a.s)
  const topK = candidateScores.slice(0, Math.min(randomTopKFreeSlot, candidateScores.length))
  const totalTop = topK.reduce((acc, t) => acc + t.s, 0)
  let r = Math.random() * totalTop
  let reservedSlot = topK[topK.length - 1].p
  for (const t of topK) {
    r -= t.s
    if (r <= 0) {
      reservedSlot = t.p
      break
    }
  }

  const positionsPoolInit = new Set(validPositions.filter(p => p !== reservedSlot))

  const bedPositionHeuristic = (bed: UIBed, pos: number) => {
    const dWard = distance(pos, wardCenterPos(bed.ward))
    const doorDist = Math.min(...Array.from(doorPositions).map(d => distance(pos, d)))
    let score = 0
    score += 1 / (1 + dWard)
    if (bed.status === "available") score += (1 / (1 + doorDist)) * 2
    else if (bed.status === "occupied") score += (doorDist / (gridCols + gridRows)) * 1.5
    else if (bed.status === "maintenance") score += distance(pos, gridCenterPos) * 0.2
    else if (bed.status === "reserved") score += (1 / (1 + dWard)) * 1.2
    if (bed.positionIndex === pos) score += 0.8
    return Math.max(score, 0.0001)
  }

  const scoreSolution = (solutionMap: Record<string, number>) => {
    let score = 0
    const byWard: Record<string, number[]> = {}
    for (const b of workingBeds) {
      const p = solutionMap[b.id]
      if (p == null || p === -1) continue
      if (!byWard[b.ward]) byWard[b.ward] = []
      byWard[b.ward].push(p)
    }
    for (const arr of Object.values(byWard)) {
      if (arr.length <= 1) {
        score += 0.1
        continue
      }
      let sumd = 0
      let pairs = 0
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          sumd += distance(arr[i], arr[j])
          pairs++
        }
      }
      const avgd = pairs ? sumd / pairs : 0
      score += (1 / (1 + avgd)) * arr.length
    }
    for (const b of workingBeds) {
      const p = solutionMap[b.id]
      if (p == null || p === -1) {
        score -= 0.5
        continue
      }
      const doorDist = Math.min(...Array.from(doorPositions).map(d => distance(p, d)))
      if (b.status === "available") score += (1 / (1 + doorDist)) * 2
      if (b.status === "occupied") score += (doorDist / (gridCols + gridRows)) * 1
      if (b.status === "maintenance") score += distance(p, gridCenterPos) * 0.05
      if (b.positionIndex === p) score += 0.2
    }
    let penalty = 0
    const posCounts: Record<number, number> = {}
    for (const id in solutionMap) {
      const p = solutionMap[id]
      if (p != null && p !== -1) posCounts[p] = (posCounts[p] || 0) + 1
    }
    for (const c of Object.values(posCounts)) {
      if (c > 1) penalty += (c - 1) * 1.5
    }
    score -= penalty
    return score
  }

  let globalBest = { score: -Infinity, solution: {} as Record<string, number> }

  const bedOrder = [...workingBeds].sort((a, b) => {
    const pa = statusOrder[a.status]
    const pb = statusOrder[b.status]
    if (pa !== pb) return pa - pb
    if (a.priority === b.priority) return 0
    return a.priority === "high" ? -1 : 1
  })

  for (let iter = 0; iter < iterations; iter++) {
    let iterationBest = { score: -Infinity, solution: {} as Record<string, number> }
    for (let ant = 0; ant < ants; ant++) {
      const available = new Set(positionsPoolInit)
      const solutionMap: Record<string, number> = {}
      for (const bed of bedOrder) {
        if (available.size === 0) {
          solutionMap[bed.id] = -1
          continue
        }
        const candidates = []
        for (const p of available) {
          const pher = Math.pow(pheromones[p], alpha)
          const heur = Math.pow(bedPositionHeuristic(bed, p), beta)
          let adjacencyBonus = 0
          for (const otherId in solutionMap) {
            const op = solutionMap[otherId]
            if (op == null || op === -1) continue
            const otherBed = workingBeds.find(bb => bb.id === otherId)
            if (otherBed?.ward === bed.ward && distance(op, p) <= 1.5) adjacencyBonus += 0.4
          }
          const desirability = pher * heur * (1 + adjacencyBonus)
          candidates.push({ p, desirability })
        }
        const sum = candidates.reduce((s, c) => s + c.desirability, 0) || 1
        let rr = Math.random() * sum
        let chosen = candidates[candidates.length - 1].p
        for (const c of candidates) {
          rr -= c.desirability
          if (rr <= 0) {
            chosen = c.p
            break
          }
        }
        solutionMap[bed.id] = chosen
        available.delete(chosen)
      }

      const sc = scoreSolution(solutionMap)
      if (sc > iterationBest.score) {
        iterationBest = { score: sc, solution: { ...solutionMap } }
      }
    }

    for (let p = 0; p < pheromones.length; p++) pheromones[p] *= evaporation
    if (iterationBest.solution) {
      for (const bid in iterationBest.solution) {
        const p = iterationBest.solution[bid]
        if (p != null && p !== -1) {
          pheromones[p] += reinforcement * (1 / (1 + Math.abs(iterationBest.score))) + 0.1
        }
      }
      if (iterationBest.score > globalBest.score) {
        globalBest = { score: iterationBest.score, solution: { ...iterationBest.solution } }
      }
    }
    for (const p of validPositions) pheromones[p] += (Math.random() - 0.5) * 0.02
  }

  const finalSolution = { ...globalBest.solution }

  if (forcedUnplaced) {
    finalSolution[forcedUnplaced.id] = -1
  } else {
    for (const bid in finalSolution) {
      if (finalSolution[bid] === reservedSlot) finalSolution[bid] = -1
    }
  }

  const optimizedBeds = cloneBeds.map(b => {
    const p = finalSolution[b.id]
    return { ...b, positionIndex: p == null ? -1 : p }
  })

  const seen = new Map<number, string>()
  for (const b of optimizedBeds) {
    if (b.positionIndex === -1) continue
    if (seen.has(b.positionIndex)) {
      let found = -1
      for (const p of validPositions) {
        if (p !== reservedSlot && !optimizedBeds.some(x => x.positionIndex === p)) {
          found = p
          break
        }
      }
      b.positionIndex = found
    } else {
      seen.set(b.positionIndex, b.id)
    }
  }

  // Add a minimal run metadata object so callers can track runs
  const meta = {
    runId: `${hospitalId}-${Date.now()}`,
    timestamp: new Date().toISOString()
  }

  return { optimizedBeds, reservedSlot, score: globalBest.score, meta }
}
