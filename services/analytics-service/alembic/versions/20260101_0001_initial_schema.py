"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-01-01

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("brand_id", sa.String(), nullable=False, index=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("reported_metrics", postgresql.JSON(), nullable=False, server_default="{}"),
        sa.Column("is_validated", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "tip_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("stellar_tx_hash", sa.String(), nullable=False, unique=True, index=True),
        sa.Column("source_account", sa.String(), nullable=False),
        sa.Column("destination_account", sa.String(), nullable=False),
        sa.Column("asset_code", sa.String(), nullable=False, server_default="XLM"),
        sa.Column("amount", sa.Numeric(20, 7), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("tip_events")
    op.drop_table("campaigns")
