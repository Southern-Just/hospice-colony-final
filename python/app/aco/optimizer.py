from typing import List, Dict, Optional, Tuple, Any
import random
from .colony import Colony
from .ant import Ant
from .environment import VALID_POSITIONS, DOOR_CENTER, distance

class AntColonySolver:
    def __init__(
        self,
        grid_positions: List[int] = VALID_POSITIONS,
        num_ants: int = 40,
        iterations: int = 150,
        evaporation: float = 0.85,
        alpha: float = 1.0,
        beta: float = 2.0,
        q_constant: float = 1.0,
    ):
        self.positions = grid_positions.copy()
        self.num_ants = num_ants
        self.iterations = iterations
        self.evaporation = evaporation
        self.alpha = alpha
        self.beta = beta
        self.q_constant = q_constant
        self.colony = Colony(self.positions, num_ants, alpha, beta)

    def _cost_of_solution(self, beds: List[Dict[str, Any]], solution: List[int]) -> float:
        total = 0.0
        for i, pos in enumerate(solution):
            prio = 1.0
            if 'priority' in beds[i]:
                prio = 1.0
                p = beds[i].get('priority')
                if p:
                    plow = p.lower()
                    if plow in ('critical', 'high'):
                        prio = 0.5
                    elif plow == 'low':
                        prio = 1.5
            total += distance(pos, DOOR_CENTER) * prio
        return total

    def solve(self, beds: List[Dict[str, Any]], seed_assignments: List[Optional[int]] | None = None) -> List[int]:
        if seed_assignments is None:
            seed_assignments = [None] * len(beds)
        available_positions = self.positions.copy()
        if len(beds) > len(available_positions):
            extras = [i for i in range(0, len(available_positions)*2) if i not in available_positions][: len(beds) - len(available_positions)]
            available_positions += extras
        best_solution: List[int] = []
        best_cost = float("inf")
        for it in range(self.iterations):
            solutions = []
            costs = []
            for _ in range(self.num_ants):
                ant = Ant(len(beds))
                remaining = available_positions.copy()
                solution = []
                for i, bed in enumerate(beds):
                    seed = seed_assignments[i]
                    if seed is not None and seed in remaining and random.random() < 0.2:
                        chosen = seed
                        remaining.remove(chosen)
                        ant.set_assignment(i, chosen)
                        solution.append(chosen)
                        continue
                    chosen = self.colony.probabilistic_choice(remaining, i, seed_assignments[i], bed.get('priority', ''))
                    remaining.remove(chosen)
                    ant.set_assignment(i, chosen)
                    solution.append(chosen)
                cost = self._cost_of_solution(beds, solution)
                solutions.append(solution)
                costs.append(cost)
                if cost < best_cost:
                    best_cost = cost
                    best_solution = solution.copy()
            self.colony.evaporate(self.evaporation)
            for sol, c in zip(solutions, costs):
                self.colony.deposit(sol, c, self.q_constant)
        if not best_solution:
            free = available_positions.copy()
            for i in range(len(beds)):
                if free:
                    best_solution.append(free.pop(0))
                else:
                    best_solution.append(0)
        return best_solution
