from app.aco.ant import Ant
import numpy as np

class Colony:
    def __init__(self, n_ants, grid_size):
        self.ants = [Ant(grid_size) for _ in range(n_ants)]
        self.grid_size = grid_size

    def run(self, pheromone_map, heuristic_map):
        solutions = []
        for ant in self.ants:
            idx = ant.choose_cell(pheromone_map, heuristic_map)
            solutions.append(idx)
        return solutions
