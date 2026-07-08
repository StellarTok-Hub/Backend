"""add campaign wallet scoping

Revision ID: 0002
Revises: 0001
Create Date: 2026-01-07

"""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "campaigns",
        sa.Column("stellar_account", sa.String(), nullable=False, server_default=""),
    )
    op.add_column(
        "campaigns",
        sa.Column(
            "starts_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_campaigns_stellar_account", "campaigns", ["stellar_account"])
    # Drop the backfill default now that existing rows are populated; new rows
    # must supply a real wallet address via the application layer.
    op.alter_column("campaigns", "stellar_account", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_campaigns_stellar_account", table_name="campaigns")
    op.drop_column("campaigns", "starts_at")
    op.drop_column("campaigns", "stellar_account")
