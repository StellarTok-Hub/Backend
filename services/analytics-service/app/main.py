from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import campaigns, health, tips
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.request_id import RequestIdMiddleware
from app.services.stellar_listener import stellar_tip_listener

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("analytics_service.startup", environment=settings.environment)
    stellar_tip_listener.start()
    yield
    await stellar_tip_listener.stop()
    logger.info("analytics_service.shutdown")


app = FastAPI(title="Analytics Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(RequestIdMiddleware)

app.include_router(health.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(tips.router, prefix="/api/v1")
