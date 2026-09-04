from app.models import Camera, Pothole, Route
from app.pothole.deduplication import find_duplicate
from app.routing.spatial import cameras_near_route, point_to_route_meters, potholes_near_route


def test_point_to_route_distance():
    path = [[-2.97, 104.73], [-2.97, 104.75]]
    assert point_to_route_meters([-2.9701, 104.74], path) < 20
    assert point_to_route_meters([-3.0, 104.74], path) > 3_000


def test_camera_and_pothole_route_matching(db):
    route = db.query(Route).first()
    cameras = cameras_near_route(db, route, 500)
    potholes = potholes_near_route(db, route, 100)
    assert any(isinstance(item, Camera) for item in cameras)
    assert any(isinstance(item, Pothole) for item in potholes)


def test_duplicate_detection(db):
    pothole = db.query(Pothole).first()
    duplicate = find_duplicate(db, pothole.latitude + 0.00001, pothole.longitude, 10)
    assert duplicate is not None
    assert find_duplicate(db, pothole.latitude + 0.01, pothole.longitude, 10) is None
