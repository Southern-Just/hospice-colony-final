from fastapi import FastAPI
from app.aco.service import router as aco_router

app = FastAPI()
app.include_router(aco_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
