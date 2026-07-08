from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.main import app


def test_health_check():
    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_check_returns_200_when_dependencies_are_reachable(monkeypatch):
    monkeypatch.setattr("app.api.routes.health._check_database", AsyncMock(return_value="ok"))
    monkeypatch.setattr("app.api.routes.health._check_redis", AsyncMock(return_value="ok"))

    with TestClient(app) as client:
        response = client.get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "checks": {"database": "ok", "redis": "ok"}}


def test_readiness_check_returns_503_when_a_dependency_is_unreachable(monkeypatch):
    monkeypatch.setattr("app.api.routes.health._check_database", AsyncMock(return_value="error"))
    monkeypatch.setattr("app.api.routes.health._check_redis", AsyncMock(return_value="ok"))

    with TestClient(app) as client:
        response = client.get("/api/v1/health/ready")

    assert response.status_code == 503
    assert response.json()["status"] == "error"
