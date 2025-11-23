from typing import List, Dict
import math

GRID_COLS = 8
GRID_ROWS = 8
GRID_SIZE = GRID_COLS * GRID_ROWS
DOOR_ROW = GRID_ROWS - 1
DOOR_RANGE_START = DOOR_ROW * GRID_COLS
DOOR_CENTER = DOOR_RANGE_START + GRID_COLS // 2
VALID_POSITIONS = [i for i in range(GRID_SIZE) if not (i >= DOOR_RANGE_START and i < DOOR_RANGE_START + GRID_COLS)]

def distance(a: int, b: int) -> float:
    ax, ay = a % GRID_COLS, a // GRID_COLS
    bx, by = b % GRID_COLS, b // GRID_COLS
    return math.hypot(ax - bx, ay - by)

def bed_priority_weight(priority: str) -> float:
    if not priority:
        return 1.0
    p = priority.lower()
    if p in ("critical", "high"):
        return 0.5
    if p == "low":
        return 1.5
    return 1.0

def default_heuristic(target_pos: int, bed_index: int, bed_initial_pos: int | None, priority: str) -> float:
    prio = bed_priority_weight(priority)
    dist = distance(bed_initial_pos if bed_initial_pos is not None else DOOR_CENTER, target_pos)
    if dist == 0:
        return 1.0 / prio
    return (1.0 / (1.0 + dist)) * (1.0 / prio)
