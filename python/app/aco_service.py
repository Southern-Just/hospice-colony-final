from fastapi import FastAPI, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import random
import math
import uvicorn

GRID_COLS = 8
GRID_ROWS = 8
GRID_SIZE = GRID_COLS * GRID_ROWS
DOOR_ROW = GRID_ROWS - 1
DOOR_RANGE_START = DOOR_ROW * GRID_COLS
VALID_POSITIONS = [i for i in range(GRID_SIZE) if not (i >= DOOR_RANGE_START and i < DOOR_RANGE_START + GRID_COLS)]

NUM_ANTS = 40
ITERATIONS = 150
EVAPORATION = 0.85
ALPHA = 1.0
BETA = 2.0
Q = 1.0

class PositionObj(BaseModel):
    x: int
    y: int

class ApiBed(BaseModel):
    id: str
    hospitalId: str
    wardId: Optional[str] = None
    bedNumber: str
    status: Optional[str] = "available"
    priority: Optional[str] = "normal"
    position: Optional[PositionObj] = None

class Payload(BaseModel):
    hospitalId: str
    beds: List[ApiBed]

app = FastAPI()

def distance(a: int, b: int) -> float:
    ax, ay = a % GRID_COLS, a // GRID_COLS
    bx, by = b % GRID_COLS, b // GRID_COLS
    return math.hypot(ax - bx, ay - by)

def bed_priority_weight(priority: str) -> float:
    if priority == "high": return 0.5
    if priority == "critical": return 0.25
    if priority == "low": return 1.5
    return 1.0

def heuristic_value(bed_index: int, target_pos: int, bed_pos_index: int) -> float:
    dist = distance(bed_pos_index, target_pos)
    if dist == 0: dist = 0.001
    p_w = bed_priority_weight(bed_index)
    return 1.0 / (1.0 + dist) * (1.0 / p_w)

@app.post("/api/aco")
async def aco_endpoint(payload: Payload):
    beds = payload.beds
    n_beds = len(beds)
    available_positions = VALID_POSITIONS.copy()
    if n_beds > len(available_positions):
        available_positions = available_positions + [i for i in range(GRID_SIZE) if i not in available_positions and i not in range(DOOR_RANGE_START, DOOR_RANGE_START + GRID_COLS)]
    pheromones = {pos: 1.0 for pos in available_positions}
    best_solution = None
    best_cost = float("inf")
    initial_positions = []
    for b in beds:
        if b.position is not None:
            initial_positions.append((b.position.x % GRID_COLS) + (b.position.y * GRID_COLS))
        else:
            initial_positions.append(None)
    for it in range(ITERATIONS):
        all_solutions = []
        all_costs = []
        for ant in range(NUM_ANTS):
            remaining_positions = available_positions.copy()
            solution = [None] * n_beds
            for i, b in enumerate(beds):
                if initial_positions[i] is not None and initial_positions[i] in remaining_positions and random.random() < 0.2:
                    chosen = initial_positions[i]
                    remaining_positions.remove(chosen)
                    solution[i] = chosen
                    continue
                weights = []
                for pos in remaining_positions:
                    pher = pheromones.get(pos, 1.0) ** ALPHA
                    row = pos // GRID_COLS
                    col = pos % GRID_COLS
                    heuristic = 1.0 / (1.0 + distance(pos, DOOR_RANGE_START + GRID_COLS // 2))
                    prio_weight = bed_priority_weight(b.priority)
                    heuristic *= (1.0 / prio_weight)
                    weights.append(pher * (heuristic ** BETA))
                if sum(weights) <= 0:
                    chosen = random.choice(remaining_positions)
                else:
                    s = sum(weights)
                    r = random.random() * s
                    cum = 0.0
                    chosen = remaining_positions[-1]
                    for idx, w in enumerate(weights):
                        cum += w
                        if r <= cum:
                            chosen = remaining_positions[idx]
                            break
                remaining_positions.remove(chosen)
                solution[i] = chosen
            cost = 0.0
            for i, pos in enumerate(solution):
                prio = bed_priority_weight(beds[i].priority)
                door_center = DOOR_RANGE_START + GRID_COLS // 2
                cost += distance(pos, door_center) * prio
            all_solutions.append(solution)
            all_costs.append(cost)
            if cost < best_cost:
                best_cost = cost
                best_solution = solution.copy()
        for pos in pheromones:
            pheromones[pos] *= (1.0 - EVAPORATION)
        for sol, c in zip(all_solutions, all_costs):
            deposit = Q / (1.0 + c)
            for pos in sol:
                pheromones[pos] = pheromones.get(pos, 0.0) + deposit
    if best_solution is None:
        best_solution = []
        free_positions = available_positions.copy()
        for i in range(n_beds):
            if free_positions:
                best_solution.append(free_positions.pop(0))
            else:
                best_solution.append(0)
    optimized = []
    for i, b in enumerate(beds):
        pos = best_solution[i] if i < len(best_solution) else None
        if pos is None:
            pos = random.choice(available_positions)
        optimized.append({
            "id": b.id,
            "hospitalId": b.hospitalId,
            "ward": b.wardId or "",
            "bedNumber": b.bedNumber,
            "status": b.status or "available",
            "positionIndex": int(pos),
            "priority": b.priority or "normal"
        })
    return {"optimizedBeds": optimized}

if __name__ == "__main__":
    uvicorn.run("aco_service:app", host="0.0.0.0", port=8000, reload=True)
