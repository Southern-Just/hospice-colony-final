import math

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def to_index(x: int, y: int, cols: int = 8):
    return y * cols + x

def to_xy(index: int, cols: int = 8):
    return (index % cols, index // cols)



# Mount the router — I included app/main.py above that mounts the ACO router at /api/aco. If you already have a main.py, add:

# from app.aco.service import router as aco_router
# app.include_router(aco_router)


# and keep your other routes intact.

# Dependencies — ensure fastapi, uvicorn, and pydantic are in your environment. Add the requirements.txt lines above to your project.

# API path — the front-end posts to /api/aco. If your Next.js or proxy configuration expects /app/api/aco or different prefix, either:

# Keep frontend as fetch("/api/aco") and let your server serve roots under that path, or

# Update the frontend to fetch("/app/api/aco") as needed.

# Tuneable parameters — the POST body accepts optional num_ants, iterations, alpha, beta, evaporation, q_constant to tune algorithm without changing code.

# Database/state updates — the service returns optimizedBeds. Your frontend already updates local state and then PUT /api/hospitals/{id}/beds to persist. I did not add direct DB persistence here — that remains in your Next.js backend or Python DB layer if you want it moved server-side.

# Unit tests / CI — I included a lightweight test stub service_stub_for_tests.py to call the router programmatically if you want to write tests.

# Extend constraints — if you want:

# Blocked cells (e.g., pillars) -> pass a blocked_positions list into AntColonySolver.

# Ward grouping -> penalize inter-ward distances in _cost_of_solution.

# Hard constraints -> disallow assignments to certain positions.

# If you want, next I can:

# Add blocked_positions and reserved_positions support and wire them to the solver.

# Make the ACO return intermediate progress events (Server-Sent Events / WebSocket) for showing progress in the UI while optimizing.

# Implement a DB-backed persistence layer (update Neon Postgres via Drizzle from this Python service) so the Python service writes new positions directly.

# Tell me which one to implement next and I’ll produce the exact file changes