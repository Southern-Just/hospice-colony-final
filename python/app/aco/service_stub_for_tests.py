# small helper you can call in tests to run ACO synchronously without FastAPI
from .service import run_aco, AcoPayload
from fastapi.testclient import TestClient
from fastapi import FastAPI

def run_direct(payload_dict):
    app = FastAPI()
    app.include_router(run_aco.__self__.__self__ if hasattr(run_aco, "__self__") else None)
    client = TestClient(app)
    return client.post("/api/aco", json=payload_dict).json()
