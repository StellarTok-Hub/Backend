from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StreamCursor(Base):
    """Tracks the last-processed Horizon paging token per named stream so a
    restart resumes where it left off instead of silently dropping events."""

    __tablename__ = "stream_cursors"

    stream_name: Mapped[str] = mapped_column(String, primary_key=True)
    cursor: Mapped[str] = mapped_column(String, nullable=False)
