from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.campaign import Campaign
from app.schemas.campaign import (
    CampaignCreateRequest,
    CampaignRead,
    CampaignValidationRequest,
    CampaignValidationResult,
)
from app.services.campaign_validator import validate_campaign

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.post("", response_model=CampaignRead, response_model_by_alias=True, status_code=201)
async def create_campaign(
    request: CampaignCreateRequest, session: AsyncSession = Depends(get_db)
) -> Campaign:
    campaign = Campaign(
        brand_id=request.brand_id,
        name=request.name,
        stellar_account=request.stellar_account,
        starts_at=request.starts_at or datetime.now(UTC),
    )
    session.add(campaign)
    await session.commit()
    await session.refresh(campaign)
    return campaign


@router.post("/validate", response_model=CampaignValidationResult, response_model_by_alias=True)
async def validate(
    request: CampaignValidationRequest, session: AsyncSession = Depends(get_db)
) -> CampaignValidationResult:
    return await validate_campaign(request, session)
