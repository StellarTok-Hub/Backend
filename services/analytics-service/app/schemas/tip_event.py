from datetime import datetime

from pydantic import BaseModel


class TipEventSchema(BaseModel):
    stellar_tx_hash: str
    source_account: str
    destination_account: str
    asset_code: str
    amount: float
    received_at: datetime

    model_config = {"from_attributes": True}
