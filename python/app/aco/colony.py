from typing import List, Dict, Optional
import random
from .ant import Ant
from .environment import VALID_POSITIONS, default_heuristic, distance, DOOR_CENTER

class Colony:
    def __init__(self, positions: List[int], num_ants: int, alpha: float, beta: float):
        self.positions = positions.copy()
        self.pheromones: Dict[int, float] = {p: 1.0 for p in self.positions}
        self.num_ants = num_ants
        self.alpha = alpha
        self.beta = beta

    def _compute_weights(self, remaining_positions: List[int], bed_idx: int, bed_initial_pos: Optional[int], priority: str):
        weights = []
        for pos in remaining_positions:
            pher = (self.pheromones.get(pos, 1.0) ** self.alpha)
            heur = default_heuristic(pos, bed_idx, bed_initial_pos, priority) ** self.beta
            weights.append(pher * heur)
        return weights

    def probabilistic_choice(self, remaining_positions: List[int], bed_idx: int, bed_initial_pos: Optional[int], priority: str) -> int:
        weights = self._compute_weights(remaining_positions, bed_idx, bed_initial_pos, priority)
        s = sum(weights)
        if s == 0:
            return random.choice(remaining_positions)
        r = random.random() * s
        cum = 0.0
        for i, w in enumerate(weights):
            cum += w
            if r <= cum:
                return remaining_positions[i]
        return remaining_positions[-1]

    def evaporate(self, evaporation_rate: float):
        for p in self.pheromones:
            self.pheromones[p] *= (1.0 - evaporation_rate)

    def deposit(self, solution: List[int], quality: float, q_constant: float):
        if quality <= 0:
            deposit = q_constant
        else:
            deposit = q_constant / (1.0 + quality)
        for pos in solution:
            self.pheromones[pos] = self.pheromones.get(pos, 0.0) + deposit
