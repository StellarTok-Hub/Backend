import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.models.campaign import Campaign
from app.schemas.campaign import CampaignValidationRequest
from app.services.campaign_validator import validate_campaign


def _make_campaign(**overrides) -> Campaign:
    defaults = {
        "id": uuid.uuid4(),
        "brand_id": "brand-1",
        "stellar_account": "GABC123",
        "starts_at": datetime(2026, 1, 1, tzinfo=UTC),
    }
    defaults.update(overrides)
    campaign = MagicMock(spec=Campaign)
    for key, value in defaults.items():
        setattr(campaign, key, value)
    return campaign


def _session_with(campaign, amounts):
    session = MagicMock()
    session.get = AsyncMock(return_value=campaign)
    result = MagicMock()
    result.scalars.return_value.all.return_value = amounts
    session.execute = AsyncMock(return_value=result)
    return session


@pytest.mark.asyncio
async def test_validates_when_reported_matches_onchain_total():
    campaign = _make_campaign()
    session = _session_with(campaign, [100.0])

    request = CampaignValidationRequest(
        campaignId=str(campaign.id), brandId="brand-1", metrics={"tip_total": 100}
    )

    outcome = await validate_campaign(request, session)

    assert outcome.is_valid is True
    assert outcome.reasons == []


@pytest.mark.asyncio
async def test_flags_reported_total_exceeding_onchain_tolerance():
    campaign = _make_campaign()
    session = _session_with(campaign, [50.0])

    request = CampaignValidationRequest(
        campaignId=str(campaign.id), brandId="brand-1", metrics={"tip_total": 200}
    )

    outcome = await validate_campaign(request, session)

    assert outcome.is_valid is False
    assert len(outcome.reasons) == 1


@pytest.mark.asyncio
async def test_rejects_brand_mismatch_without_leaking_wallet_data():
    campaign = _make_campaign(brand_id="brand-1")
    session = _session_with(campaign, [999.0])

    request = CampaignValidationRequest(
        campaignId=str(campaign.id), brandId="brand-2", metrics={"tip_total": 1}
    )

    outcome = await validate_campaign(request, session)

    assert outcome.is_valid is False
    session.execute.assert_not_called()


@pytest.mark.asyncio
async def test_unknown_campaign_raises_404():
    session = MagicMock()
    session.get = AsyncMock(return_value=None)

    request = CampaignValidationRequest(
        campaignId=str(uuid.uuid4()), brandId="brand-1", metrics={"tip_total": 100}
    )

    with pytest.raises(HTTPException) as exc_info:
        await validate_campaign(request, session)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_non_uuid_campaign_id_raises_400():
    session = MagicMock()

    request = CampaignValidationRequest(
        campaignId="not-a-uuid", brandId="brand-1", metrics={"tip_total": 100}
    )

    with pytest.raises(HTTPException) as exc_info:
        await validate_campaign(request, session)

    assert exc_info.value.status_code == 400
