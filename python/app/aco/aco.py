def run_aco(request):
    beds = request.beds

    # TEMP LOGIC (works immediately)
    optimized = []
    for i, b in enumerate(beds):
        optimized.append({
            "id": b.id,
            "bedNumber": b.bedNumber,
            "ward": b.ward,
            "status": b.status,
            "priority": b.priority,
            "positionIndex": i  # ACO later replaces this with real optimization
        })

    return optimized
