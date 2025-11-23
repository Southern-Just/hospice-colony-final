from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from .optimizer import AntColonySolver
from .environment import VALID_POSITIONS

router = APIRouter()

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

class AcoPayload(BaseModel):
    hospitalId: str
    beds: List[ApiBed]
    num_ants: Optional[int] = 40
    iterations: Optional[int] = 150
    alpha: Optional[float] = 1.0
    beta: Optional[float] = 2.0
    evaporation: Optional[float] = 0.85
    q_constant: Optional[float] = 1.0

@router.post("/api/aco")
async def run_aco(payload: AcoPayload):
    beds = payload.beds
    if not beds:
        raise HTTPException(status_code=400, detail="No beds provided")
    grid_positions = VALID_POSITIONS.copy()
    solver = AntColonySolver(
        grid_positions=grid_positions,
        num_ants=payload.num_ants or 40,
        iterations=payload.iterations or 150,
        evaporation=payload.evaporation or 0.85,
        alpha=payload.alpha or 1.0,
        beta=payload.beta or 2.0,
        q_constant=payload.q_constant or 1.0,
    )
    seed_assignments = []
    for b in beds:
        if b.position is not None:
            seed_assignments.append(b.position.x + b.position.y * 8)
        else:
            seed_assignments.append(None)
    bed_dicts = []
    for b in beds:
        bed_dicts.append({
            "id": b.id,
            "priority": b.priority or "normal",
            "status": b.status or "available"
        })
    best_solution = solver.solve(bed_dicts, seed_assignments=seed_assignments)
    optimized = []
    for i, b in enumerate(beds):
        pos = best_solution[i] if i < len(best_solution) else None
        optimized.append({
            "id": b.id,
            "hospitalId": b.hospitalId,
            "ward": b.wardId or "",
            "bedNumber": b.bedNumber,
            "status": b.status or "available",
            "positionIndex": int(pos) if pos is not None else None,
            "priority": b.priority or "normal"
        })
    return {"optimizedBeds": optimized}
