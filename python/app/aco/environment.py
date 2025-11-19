import numpy as np

def build_heuristic_map(beds, grid_size):
    h = np.ones(grid_size)
    for b in beds:
        if b.status == "occupied":
            h[b.position['y'] * 8 + b.position['x']] += 0.5
        if b.status == "maintenance":
            h[b.position['y'] * 8 + b.position['x']] *= 0.2
    return h
