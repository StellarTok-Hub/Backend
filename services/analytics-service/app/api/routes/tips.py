from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.tip_event import TipEvent
from app.schemas.tip_event import TipEventSchema

router = APIRouter(prefix="/tips", tags=["tips"])


@router.get("/recent", response_model=list[TipEventSchema])
async def recent_tips(
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
) -> list[TipEvent]:
    result = await session.execute(
        select(TipEvent).order_by(TipEvent.received_at.desc()).limit(limit)
    )
    return list(result.scalars().all())
