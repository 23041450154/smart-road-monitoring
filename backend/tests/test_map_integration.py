from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.geometry import database_geometry, line_wkt, point_wkt
from app.models import Camera, Pothole, Route, RouteType, Severity, User
from app.routing.spatial import point_to_route_meters, potholes_near_route


def geo_json_to_leaflet(coord: list[float]) -> list[float]:
    """Helper representing geoJsonToLeafletLatLng: [lng, lat] -> [lat, lng]."""
    return [coord[1], coord[0]]


def leaflet_to_geo_json(coord: list[float]) -> list[float]:
    """Helper representing leafletToGeoJsonLatLng: [lat, lng] -> [lng, lat]."""
    return [coord[1], coord[0]]


def test_coordinate_orientation_geojson_vs_leaflet():
    # Palembang sample: lat -2.981, lng 104.748
    leaflet_point = [-2.981, 104.748]  # [lat, lng]
    geojson_point = [104.748, -2.981]  # [lng, lat]

    # Convert Leaflet -> GeoJSON
    converted_geojson = leaflet_to_geo_json(leaflet_point)
    assert converted_geojson == geojson_point
    assert converted_geojson[0] == 104.748  # longitude first
    assert converted_geojson[1] == -2.981   # latitude second

    # Convert GeoJSON -> Leaflet
    converted_leaflet = geo_json_to_leaflet(geojson_point)
    assert converted_leaflet == leaflet_point
    assert converted_leaflet[0] == -2.981   # latitude first
    assert converted_leaflet[1] == 104.748  # longitude second


def test_wkt_generators_use_correct_lon_lat_order():
    lat, lng = -2.9763, 104.7501
    wkt = point_wkt(lat, lng)
    assert wkt == "POINT(104.7501 -2.9763)"  # PostGIS WKT standard: POINT(lon lat)

    path = [[-2.9763, 104.7501], [-2.9780, 104.7520]]
    lwkt = line_wkt(path)
    assert lwkt == "LINESTRING(104.7501 -2.9763, 104.752 -2.978)"


def test_camera_and_pothole_coordinates_persistence(db: Session):
    camera = Camera(
        name="Test Kamera Ilir Barat",
        road_name="Jl. Kolonel Atmo",
        latitude=-2.9850,
        longitude=104.7580,
        location=database_geometry(db, point_wkt(-2.9850, 104.7580)),
        is_active=True,
    )
    pothole = Pothole(
        latitude=-2.9852,
        longitude=104.7582,
        location=database_geometry(db, point_wkt(-2.9852, 104.7582)),
        road_name="Jl. Kolonel Atmo",
        confidence=0.88,
        severity=Severity.HIGH,
    )
    db.add_all([camera, pothole])
    db.commit()

    saved_cam = db.get(Camera, camera.id)
    saved_ph = db.get(Pothole, pothole.id)

    assert saved_cam is not None
    assert saved_cam.latitude == -2.9850
    assert saved_cam.longitude == 104.7580

    assert saved_ph is not None
    assert saved_ph.latitude == -2.9852
    assert saved_ph.longitude == 104.7582
    assert saved_ph.severity == Severity.HIGH


def test_route_spatial_matching_with_buffer(db: Session):
    user = db.scalar(select(User))
    assert user is not None

    # Route along Jl. Sudirman
    path = [
        [-2.9700, 104.7400],
        [-2.9750, 104.7450],
        [-2.9800, 104.7500],
    ]
    route = Route(
        user_id=user.id,
        name="Test Koridor Sudirman",
        route_type=RouteType.COMMUTE_TO_WORK,
        start_latitude=path[0][0],
        start_longitude=path[0][1],
        destination_latitude=path[-1][0],
        destination_longitude=path[-1][1],
        path=path,
        geometry=database_geometry(db, line_wkt(path)),
    )
    db.add(route)

    # Add 1 close pothole (~20m) and 1 far pothole (>5000m)
    close_ph = Pothole(
        latitude=-2.9751,
        longitude=104.7451,
        location=database_geometry(db, point_wkt(-2.9751, 104.7451)),
        confidence=0.9,
        severity=Severity.MEDIUM,
    )
    far_ph = Pothole(
        latitude=-2.9200,
        longitude=104.7000,
        location=database_geometry(db, point_wkt(-2.9200, 104.7000)),
        confidence=0.9,
        severity=Severity.LOW,
    )
    db.add_all([close_ph, far_ph])
    db.commit()

    # Query with 100m buffer
    matched_potholes = potholes_near_route(db, route, buffer_meters=100)
    matched_ids = [p.id for p in matched_potholes]

    assert close_ph.id in matched_ids
    assert far_ph.id not in matched_ids


def test_point_to_route_distance_accuracy():
    # Straight segment from [0, 0] to [0, 2] in degrees along equator
    route = [[0.0, 0.0], [0.0, 0.01]]  # 0.01 deg lon is approx 1113 meters
    query_point = [0.0001, 0.005]       # 0.0001 deg lat off perpendicular (~11.1 meters)

    dist = point_to_route_meters(query_point, route)
    assert 10.0 < dist < 12.0
