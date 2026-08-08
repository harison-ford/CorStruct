# CorStruct Backend

FastAPI API with Supabase JWT (ES256/JWKS) authentication.

## Setup

```powershell
cd c:\Users\Lenovo\Documents\CorStruct
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` with your real Supabase project values (see **Smoke test** below).

## Run

Imports are package-relative from the `backend/` directory:

```powershell
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Docs: http://localhost:8000/docs
- Health: `GET /health` (no auth)
- Current user: `GET /user` with `Authorization: Bearer <supabase_access_token>`

The app validates `SUPABASE_JWKS_URL` (and a resolvable JWT issuer) at startup. Missing auth config fails immediately instead of on the first `/user` request.

## Smoke test (live Supabase)

1. Create or open a project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
3. Set:
   - `SUPABASE_JWKS_URL=<SUPABASE_URL>/auth/v1/.well-known/jwks.json`
   - `SUPABASE_JWT_ISSUER=<SUPABASE_URL>/auth/v1`
   - `CORS_ORIGINS=http://localhost:3000` (comma-separate more origins if needed)
4. Sign in via your frontend (or Supabase Auth) and copy the **access token**.
5. Restart the API, then:

```powershell
curl http://localhost:8000/health
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:8000/user
```

Expected: `/health` → `{"status":"ok"}`; `/user` → JSON with `id`, optional `email`, and `role` (usually `"authenticated"`).

Without a token, `/user` returns **401**.
