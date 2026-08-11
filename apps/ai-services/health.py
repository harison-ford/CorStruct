from fastapi import APIRouter, status

from redis_client import get_redis
from supabase_client import get_supabase

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    redis_status = "ok"
    try:
        if not get_redis().ping():
            redis_status = "error"
    except Exception:
        redis_status = "unavailable"

    supabase_status = "ok"
    try:
        get_supabase()
    except Exception:
        supabase_status = "unavailable"
    if(redis_status == "ok" and supabase_status == "ok"):
        overall = "ok"
    else:
        overall = "degraded"
    
    return {
        "status": overall,
        "redis": redis_status,
        "supabase": supabase_status,
    }
