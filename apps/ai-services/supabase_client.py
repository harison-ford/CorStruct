import os

from supabase import Client, create_client

_supabase_client = None


def get_supabase() -> Client:
    """Uses service-role key (bypasses RLS — backend only)."""
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
            )
        _supabase_client = create_client(url, key)
    return _supabase_client


def close_supabase() -> None:
    global _supabase_client
    _supabase_client = None
