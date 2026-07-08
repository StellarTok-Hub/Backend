"""add stream cursors table

Revision ID: 0003
Revises: 0002
Create Date: 2026-01-08

"""

import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stream_cursors",
        sa.Column("stream_name", sa.String(), primary_key=True),
        sa.Column("cursor", sa.String(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("stream_cursors")
