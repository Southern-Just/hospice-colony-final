from fastapi import FastAPI
from app.schemas import ACORequest, ACOResponse
from app.aco.aco import run_aco

app = FastAPI()

@app.post("/aco/run", response_model=ACOResponse)
def run_aco_route(body: ACORequest):
    optimized = run_aco(body)
    return {"optimizedBeds": optimized}
