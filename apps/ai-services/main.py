import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from logging_util import setup_logging, info_log

from health import router as health_router
from redis_client import close_redis, get_redis
from supabase_client import close_supabase, get_supabase

# Prefer repo root .env, then local
_root_env = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_root_env)
load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    setup_logging()
    get_redis()
    get_supabase()
    info_log("AI Service started", "NULL_TENANT_ID")
    yield
    close_redis()
    close_supabase()
    info_log("AI Service stopped", "NULL_TENANT_ID")


origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGIN", os.getenv("CORS_ORIGINS", "http://localhost:3000")).split(",")
    if origin.strip()
]

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
