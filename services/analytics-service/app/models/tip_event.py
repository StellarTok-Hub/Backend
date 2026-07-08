import uuid
from datetime import datetime

from sqlalchemy import DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TipEvent(Base):
    __tablename__ = "tip_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    stellar_tx_hash: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    source_account: Mapped[str] = mapped_column(String, nullable=False)
    destination_account: Mapped[str] = mapped_column(String, nullable=False)
    asset_code: Mapped[str] = mapped_column(String, default="XLM")
    amount: Mapped[float] = mapped_column(Numeric(20, 7), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
