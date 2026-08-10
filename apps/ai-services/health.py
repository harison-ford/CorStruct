from fastapi import APIRouter, status

from redis_client import get_redis

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    redis_status = "ok"
    try:
        if get_redis().ping():
            redis_status = "ok"
        else:
            redis_status = "error"
    except Exception:
        redis_status = "unavailable"

    overall = "ok" if redis_status == "ok" else "degraded"
    return {
        "status": overall,
        "redis": redis_status,
    }
