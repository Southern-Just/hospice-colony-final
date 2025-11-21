import numpy as np
from app.aco.colony import Colony
from app.aco.environment import build_heuristic_map
from app.schemas.request import ACORequest
from app.schemas.response import ACOResponse, BedResult

GRID_SIZE = 64  # 8x8

def run_aco_optimization(req: ACORequest) -> ACOResponse:
    beds = req.beds

    pheromone = np.ones(GRID_SIZE)
    heuristic = build_heuristic_map(beds, GRID_SIZE)

    colony = Colony(n_ants=25, grid_size=GRID_SIZE)
    chosen_cells = colony.run(pheromone, heuristic)

    updated = []
    for bed, pos in zip(beds, chosen_cells):
        updated.append(
            BedResult(
                id=bed.id,
                position={"x": pos % 8, "y": pos // 8},
                status=bed.status
            )
        )

    return ACOResponse(
        optimized=updated,
        message="ACO optimization completed"
    )
