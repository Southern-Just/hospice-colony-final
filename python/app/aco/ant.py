from typing import List
import random

class Ant:
    def __init__(self, bed_count: int):
        self.assignment: List[int] = [-1] * bed_count

    def set_assignment(self, idx: int, pos: int):
        self.assignment[idx] = pos

    def get_assignment(self) -> List[int]:
        return self.assignment
