def test_root_serves_index(client, frontend_dist):
    r = client.get("/")
    assert r.status_code == 200
    assert "SPA root" in r.text


def test_extensionless_route_maps_to_html(client, frontend_dist):
    r = client.get("/login")
    assert r.status_code == 200
    assert "Login" in r.text


def test_unknown_client_route_falls_back_to_index(client, frontend_dist):
    r = client.get("/some/deep/client-route")
    assert r.status_code == 200
    assert "SPA root" in r.text


def test_hashed_asset_is_served_with_long_cache(client, frontend_dist):
    r = client.get("/_next/static/app.js")
    assert r.status_code == 200
    assert "immutable" in r.headers.get("cache-control", "")


def test_unknown_api_route_is_json_404(client, frontend_dist):
    r = client.get("/api/does-not-exist")
    assert r.status_code == 404
    assert r.json() == {"detail": "Not found"}


def test_path_traversal_is_rejected(client, frontend_dist):
    r = client.get("/../../../../etc/passwd")
    assert r.status_code in (404, 200)  # never leaks the real file
    assert "root:" not in r.text


def test_missing_build_returns_503(client, tmp_path, monkeypatch):
    from app.config import get_settings

    monkeypatch.setenv("FRONTEND_DIST", str(tmp_path / "nonexistent"))
    get_settings.cache_clear()
    try:
        r = client.get("/")
        assert r.status_code == 503
        assert "Frontend build not found" in r.text
    finally:
        get_settings.cache_clear()
