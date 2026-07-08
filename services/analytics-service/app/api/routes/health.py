from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.services.redis_client import get_redis

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Cheap liveness check: is the process up. Must never touch a dependency."""
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness_check() -> JSONResponse:
    """Readiness check: can this instance actually serve traffic. Checks DB and Redis."""
    checks = {"database": await _check_database(), "redis": await _check_redis()}
    healthy = all(value == "ok" for value in checks.values())

    return JSONResponse(
        status_code=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "ok" if healthy else "error", "checks": checks},
    )


async def _check_database() -> str:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return "ok"
    except Exception:  # noqa: BLE001 - any failure means "not ready"
        return "error"


async def _check_redis() -> str:
    try:
        await get_redis().ping()
        return "ok"
    except Exception:  # noqa: BLE001 - any failure means "not ready"
        return "error"
