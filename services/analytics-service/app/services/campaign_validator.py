import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.tip_event import TipEvent
from app.schemas.campaign import CampaignValidationRequest, CampaignValidationResult

# Fraction by which a brand-reported metric may exceed the on-chain-derived
# figure before it's flagged. TODO: make this configurable per campaign tier.
TOLERANCE = 0.05


async def validate_campaign(
    request: CampaignValidationRequest, session: AsyncSession
) -> CampaignValidationResult:
    campaign = await _get_campaign(request.campaign_id, session)
    reasons: list[str] = []

    if campaign.brand_id != request.brand_id:
        # Prevents one brand from validating (and thereby probing) another
        # brand's campaign by guessing its id.
        return CampaignValidationResult(
            campaignId=request.campaign_id,
            isValid=False,
            reasons=["Campaign does not belong to the specified brand"],
        )

    reported_tips = request.metrics.get("tip_total")
    if reported_tips is not None:
        observed_total = await _observed_tip_total(campaign, session)

        if observed_total == 0:
            reasons.append(
                "No on-chain tip activity found on this campaign's wallet to corroborate "
                "reported metrics"
            )
        elif reported_tips > observed_total * (1 + TOLERANCE):
            reasons.append(
                f"Reported tip_total ({reported_tips}) exceeds the on-chain observed total for "
                f"this campaign's wallet ({observed_total}) beyond the {TOLERANCE:.0%} tolerance"
            )

    return CampaignValidationResult(
        campaignId=request.campaign_id,
        isValid=len(reasons) == 0,
        reasons=reasons,
    )


async def _get_campaign(campaign_id: str, session: AsyncSession) -> Campaign:
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid campaignId"
        ) from exc

    campaign = await session.get(Campaign, campaign_uuid)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    return campaign


async def _observed_tip_total(campaign: Campaign, session: AsyncSession) -> float:
    result = await session.execute(
        select(TipEvent.amount).where(
            TipEvent.destination_account == campaign.stellar_account,
            TipEvent.received_at >= campaign.starts_at,
        )
    )
    amounts = result.scalars().all()
    return float(sum(amounts))
