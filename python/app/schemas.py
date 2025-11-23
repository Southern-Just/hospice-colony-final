from pydantic import BaseModel
from typing import Optional

class PositionObj(BaseModel):
    x: int
    y: int

class ApiBed(BaseModel):
    id: str
    hospitalId: str
    wardId: Optional[str] = None
    bedNumber: str
    status: Optional[str] = "available"
    priority: Optional[str] = "normal"
    position: Optional[PositionObj] = None
