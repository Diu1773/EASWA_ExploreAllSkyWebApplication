import sys
from pathlib import Path

from fastapi.testclient import TestClient


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from routers import auth, records


def _client_with_user(user_id: int) -> TestClient:
    client = TestClient(app)
    token = auth._signer.dumps({"uid": user_id})
    client.cookies.set("easwa_session", token)
    return client


def test_auth_me_includes_admin_flag(monkeypatch):
    monkeypatch.setattr(auth, "ADMIN_EMAILS", frozenset({"admin@example.com"}))
    monkeypatch.setattr(
        auth,
        "get_user_by_id",
        lambda user_id: {
            "id": user_id,
            "name": "Admin User",
            "email": "admin@example.com",
            "picture": None,
        },
    )

    response = _client_with_user(1).get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["is_admin"] is True


def test_admin_guide_stats_requires_login():
    response = TestClient(app).get("/api/records/admin/guide-stats")

    assert response.status_code == 401
    assert response.json()["detail"] == "Not logged in."


def test_admin_guide_stats_rejects_non_admin(monkeypatch):
    monkeypatch.setattr(auth, "ADMIN_EMAILS", frozenset({"admin@example.com"}))
    monkeypatch.setattr(
        auth,
        "get_user_by_id",
        lambda user_id: {
            "id": user_id,
            "name": "Student User",
            "email": "student@example.com",
            "picture": None,
        },
    )

    response = _client_with_user(2).get("/api/records/admin/guide-stats")

    assert response.status_code == 403
    assert response.json()["detail"] == "Forbidden"


def test_admin_guide_stats_allows_configured_admin(monkeypatch):
    monkeypatch.setattr(auth, "ADMIN_EMAILS", frozenset({"admin@example.com"}))
    monkeypatch.setattr(
        auth,
        "get_user_by_id",
        lambda user_id: {
            "id": user_id,
            "name": "Admin User",
            "email": "admin@example.com",
            "picture": None,
        },
    )
    monkeypatch.setattr(
        records,
        "get_guide_answer_stats",
        lambda: {
            "total_records": 1,
            "records_with_guide": 1,
            "question_stats": {"select_q1": {"O": 1}},
        },
    )

    response = _client_with_user(3).get("/api/records/admin/guide-stats")

    assert response.status_code == 200
    assert response.json()["total_records"] == 1
