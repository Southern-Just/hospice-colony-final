from pydantic import BaseModel
from typing import List

class Bed(BaseModel):
    id: str
    bedNumber: str
    ward: str
    status: str
    priority: str
    positionIndex: int

class ACORequest(BaseModel):
    hospitalId: str
    beds: List[Bed]

class ACOResponse(BaseModel):
    optimizedBeds: List[Bed]
