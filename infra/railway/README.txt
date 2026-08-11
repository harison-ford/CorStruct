# Shared notes for Railway (dev). Each app has its own railway.toml:
#   apps/api/railway.toml
#   apps/ai-services/railway.toml
#
# Project shape (one Railway project = one environment, e.g. "dev"):
#   - Service: api          (NestJS)     Root Directory = apps/api
#   - Service: ai-services  (FastAPI)    Root Directory = apps/ai-services
#   - Database: Redis                    provides REDIS_URL
#
# Shared secrets go in a Railway Variable Group (e.g. "supabase-dev")
# and are linked to both services. Never commit real secrets.
