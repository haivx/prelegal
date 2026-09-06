GOOD = {"email": "founder@acmecorp.com", "password": "correct horse battery"}


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_signup_logs_the_user_in(client):
    r = client.post("/api/auth/signup", json=GOOD)
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == GOOD["email"]
    assert "password" not in body and "password_hash" not in body

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == GOOD["email"]


def test_email_is_normalised_and_unique(client):
    assert client.post("/api/auth/signup", json=GOOD).status_code == 201
    dup = client.post(
        "/api/auth/signup",
        json={"email": "Founder@ACMECORP.com", "password": "another one here"},
    )
    assert dup.status_code == 409


def test_login_roundtrip_and_logout(client):
    client.post("/api/auth/signup", json=GOOD)
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401

    ok = client.post("/api/auth/login", json=GOOD)
    assert ok.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_login_rejects_bad_credentials(client):
    client.post("/api/auth/signup", json=GOOD)
    client.post("/api/auth/logout")

    wrong_pw = client.post(
        "/api/auth/login", json={"email": GOOD["email"], "password": "nope nope nope"}
    )
    assert wrong_pw.status_code == 401

    no_user = client.post(
        "/api/auth/login", json={"email": "ghost@acmecorp.com", "password": "whatever pw"}
    )
    assert no_user.status_code == 401


def test_validation_errors(client):
    assert client.post(
        "/api/auth/signup", json={"email": "not-an-email", "password": "long enough"}
    ).status_code == 422
    assert client.post(
        "/api/auth/signup", json={"email": "a@b.co", "password": "short"}
    ).status_code == 422


def test_database_starts_empty_each_run(client):
    """A brand-new client (fresh startup) must not see the previous run's user."""
    client.post("/api/auth/signup", json=GOOD)
    assert client.get("/api/auth/me").status_code == 200

    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as fresh:
        assert fresh.get("/api/auth/me").status_code == 401
        # The email from the previous run is free again.
        assert fresh.post("/api/auth/login", json=GOOD).status_code == 401
