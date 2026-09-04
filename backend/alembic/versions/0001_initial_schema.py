"""Initial PostGIS schema.

Revision ID: 0001
Revises:
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

traffic_status = sa.Enum("LANCAR", "SEDANG", "PADAT", "MACET", name="trafficstatus")
route_type = sa.Enum("COMMUTE_TO_WORK", "COMMUTE_HOME", "CUSTOM", name="routetype")
pothole_status = sa.Enum("ACTIVE", "REPAIRED", "UNVERIFIED", name="potholestatus")
severity = sa.Enum("LOW", "MEDIUM", "HIGH", name="severity")


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), nullable=True, unique=True),
        sa.Column("timezone", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "cameras",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("road_name", sa.String(160), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column(
            "location",
            geoalchemy2.Geometry("POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("stream_url", sa.Text(), nullable=True),
        sa.Column("stream_type", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        sa.Column("low_threshold", sa.Integer(), nullable=False),
        sa.Column("medium_threshold", sa.Integer(), nullable=False),
        sa.Column("high_threshold", sa.Integer(), nullable=False),
        sa.Column("counting_line", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "routes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("route_type", route_type, nullable=False),
        sa.Column("start_latitude", sa.Float(), nullable=False),
        sa.Column("start_longitude", sa.Float(), nullable=False),
        sa.Column("destination_latitude", sa.Float(), nullable=False),
        sa.Column("destination_longitude", sa.Float(), nullable=False),
        sa.Column(
            "geometry",
            geoalchemy2.Geometry("LINESTRING", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("path", sa.JSON(), nullable=False),
        sa.Column("notification_time", sa.Time(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "potholes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column(
            "location",
            geoalchemy2.Geometry("POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("road_name", sa.String(160), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("severity", severity, nullable=False),
        sa.Column("image_path", sa.Text(), nullable=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", pothole_status, nullable=False),
    )
    op.create_table(
        "traffic_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "camera_id",
            sa.Integer(),
            sa.ForeignKey("cameras.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("motorcycle_count", sa.Integer(), nullable=False),
        sa.Column("car_count", sa.Integer(), nullable=False),
        sa.Column("bus_count", sa.Integer(), nullable=False),
        sa.Column("truck_count", sa.Integer(), nullable=False),
        sa.Column("total_count", sa.Integer(), nullable=False),
        sa.Column("congestion_score", sa.Float(), nullable=False),
        sa.Column("traffic_status", traffic_status, nullable=False),
    )
    op.create_index("ix_traffic_snapshots_camera_id", "traffic_snapshots", ["camera_id"])
    op.create_index("ix_traffic_snapshots_timestamp", "traffic_snapshots", ["timestamp"])
    op.create_table(
        "vehicle_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "camera_id",
            sa.Integer(),
            sa.ForeignKey("cameras.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tracker_id", sa.String(80), nullable=False),
        sa.Column("vehicle_type", sa.String(30), nullable=False),
        sa.Column("direction", sa.String(20), nullable=True),
        sa.Column("first_seen", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_vehicle_events_camera_id", "vehicle_events", ["camera_id"])
    op.create_index("ix_routes_user_id", "routes", ["user_id"])
    op.create_index("ix_cameras_location", "cameras", ["location"], postgresql_using="gist")
    op.create_index("ix_routes_geometry", "routes", ["geometry"], postgresql_using="gist")
    op.create_index("ix_potholes_location", "potholes", ["location"], postgresql_using="gist")


def downgrade() -> None:
    op.drop_table("vehicle_events")
    op.drop_table("traffic_snapshots")
    op.drop_table("potholes")
    op.drop_table("routes")
    op.drop_table("cameras")
    op.drop_table("users")
    severity.drop(op.get_bind(), checkfirst=True)
    pothole_status.drop(op.get_bind(), checkfirst=True)
    route_type.drop(op.get_bind(), checkfirst=True)
    traffic_status.drop(op.get_bind(), checkfirst=True)
