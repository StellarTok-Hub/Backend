from fastapi.testclient import TestClient

from app.main import app


def test_generates_a_request_id_when_none_is_supplied():
    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert "x-request-id" in response.headers
    assert len(response.headers["x-request-id"]) > 0


def test_echoes_back_an_inbound_request_id_unchanged():
    with TestClient(app) as client:
        response = client.get("/api/v1/health", headers={"X-Request-Id": "trace-abc-123"})

    assert response.headers["x-request-id"] == "trace-abc-123"
