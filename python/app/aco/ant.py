import numpy as np

class Ant:
    def __init__(self, grid_size):
        self.grid_size = grid_size
        self.path = []

    def choose_cell(self, pheromone_map, heuristic_map):
        prob = pheromone_map * heuristic_map
        prob = prob / np.sum(prob)
        idx = np.random.choice(len(prob), p=prob)
        self.path.append(idx)
        return idx
