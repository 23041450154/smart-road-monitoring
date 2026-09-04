import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["DEMO_MODE"] = "true"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.seed import seed_demo
from app.db.session import get_db
from app.main import app

test_engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestSession = sessionmaker(bind=test_engine, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def database():
    Base.metadata.create_all(test_engine)
    with TestSession() as session:
        seed_demo(session)
    yield
    Base.metadata.drop_all(test_engine)


@pytest.fixture
def db(database) -> Session:
    with TestSession() as session:
        yield session


@pytest.fixture
def client(database) -> TestClient:
    def override_db():
        with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
