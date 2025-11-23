from typing import List, Dict, Any
from .optimizer import AntColonySolver

def tune_parameters(beds_sample: List[Dict[str, Any]], experiments: int = 5):
    best_conf = None
    best_score = float("inf")
    for n_ants in [20, 40, 80]:
        for iters in [80, 150, 300]:
            solver = AntColonySolver(num_ants=n_ants, iterations=iters)
            sol = solver.solve(beds_sample)
            score = solver._cost_of_solution(beds_sample, sol)
            if score < best_score:
                best_score = score
                best_conf = {"num_ants": n_ants, "iterations": iters, "score": score}
    return best_conf
