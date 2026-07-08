from datetime import datetime

from pydantic import BaseModel, Field


class CampaignCreateRequest(BaseModel):
    brand_id: str = Field(alias="brandId")
    name: str
    stellar_account: str = Field(alias="stellarAccount")
    starts_at: datetime | None = Field(default=None, alias="startsAt")

    model_config = {"populate_by_name": True}


class CampaignRead(BaseModel):
    id: str
    brand_id: str = Field(alias="brandId")
    name: str
    stellar_account: str = Field(alias="stellarAccount")
    starts_at: datetime = Field(alias="startsAt")
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True, "by_alias": True, "from_attributes": True}


class CampaignValidationRequest(BaseModel):
    campaign_id: str = Field(alias="campaignId")
    brand_id: str = Field(alias="brandId")
    metrics: dict[str, float]

    model_config = {"populate_by_name": True}


class CampaignValidationResult(BaseModel):
    campaign_id: str = Field(alias="campaignId")
    is_valid: bool = Field(alias="isValid")
    reasons: list[str]

    model_config = {"populate_by_name": True, "by_alias": True}
