"""Add user auth and WhatsApp notification fields.

Revision ID: 0003_add_user_auth_and_wa
Revises: 0002_unknown_severity
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_user_auth_and_wa"
down_revision: str | None = "0002_unknown_severity"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    user_role = sa.Enum("ADMIN", "USER", name="userrole")
    user_role.create(op.get_bind(), checkfirst=True)

    op.add_column("users", sa.Column("hashed_password", sa.String(255), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.Enum("ADMIN", "USER", name="userrole"),
            nullable=False,
            server_default="USER",
        ),
    )
    op.add_column("users", sa.Column("phone_number", sa.String(32), nullable=True))
    op.add_column(
        "users",
        sa.Column("wa_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "users",
        sa.Column("notification_lead_minutes", sa.Integer(), nullable=False, server_default="5"),
    )


def downgrade() -> None:
    op.drop_column("users", "notification_lead_minutes")
    op.drop_column("users", "wa_notifications_enabled")
    op.drop_column("users", "phone_number")
    op.drop_column("users", "role")
    op.drop_column("users", "hashed_password")
