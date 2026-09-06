import json

import pytest

import app.llm as llm

GOOD_USER = {"email": "founder@acmecorp.com", "password": "correct horse battery"}

EMPTY_FIELDS = {
    "partyOneName": None,
    "partyTwoName": None,
    "purpose": None,
    "effectiveDate": None,
    "mndaTermType": None,
    "mndaTermYears": None,
    "confidentialityTermType": None,
    "confidentialityTermYears": None,
    "governingLaw": None,
    "jurisdiction": None,
    "modifications": None,
}


class _FakeResponse:
    """Mimics the shape of a litellm completion response."""

    def __init__(self, content: str):
        message = type("Msg", (), {"content": content})()
        choice = type("Choice", (), {"message": message})()
        self.choices = [choice]


def _reply_json(**overrides) -> str:
    fields = {**EMPTY_FIELDS, **overrides.pop("fields", {})}
    payload = {
        "reply": overrides.pop("reply", "Who are the two parties?"),
        "fields": fields,
        "readyToDownload": overrides.pop("ready", False),
    }
    return json.dumps(payload)


@pytest.fixture
def with_key(monkeypatch):
    """Give the app a (fake) OpenRouter key for the duration of a test."""
    from app.config import get_settings

    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def signed_in(client):
    assert client.post("/api/auth/signup", json=GOOD_USER).status_code == 201
    return client


def _post_chat(client, **body):
    body.setdefault("messages", [{"role": "user", "content": "hi"}])
    body.setdefault("fields", EMPTY_FIELDS)
    return client.post("/api/chat", json=body)


def test_chat_returns_reply_and_extracted_fields(signed_in, with_key, monkeypatch):
    captured = {}

    def fake_completion(**kwargs):
        captured.update(kwargs)
        return _FakeResponse(
            _reply_json(
                reply="Got it - what's the purpose?",
                fields={"partyOneName": "Acme, Inc.", "partyTwoName": "Beta LLC"},
            )
        )

    monkeypatch.setattr(llm, "completion", fake_completion)

    r = _post_chat(
        signed_in,
        messages=[{"role": "user", "content": "Acme and Beta"}],
    )

    assert r.status_code == 200
    body = r.json()
    assert body["reply"] == "Got it - what's the purpose?"
    assert body["fields"]["partyOneName"] == "Acme, Inc."
    assert body["fields"]["partyTwoName"] == "Beta LLC"
    assert body["fields"]["jurisdiction"] is None
    assert body["readyToDownload"] is False

    # The model is asked for the Cerebras-routed gpt-oss model with a schema.
    assert captured["model"] == "openrouter/openai/gpt-oss-120b"
    assert captured["extra_body"] == {"provider": {"order": ["cerebras"]}}
    assert captured["api_key"] == "test-key"
    assert captured["messages"][0]["role"] == "system"


def test_chat_passes_known_fields_back_to_the_model(signed_in, with_key, monkeypatch):
    captured = {}

    def fake_completion(**kwargs):
        captured.update(kwargs)
        return _FakeResponse(_reply_json())

    monkeypatch.setattr(llm, "completion", fake_completion)

    _post_chat(
        signed_in,
        fields={**EMPTY_FIELDS, "partyOneName": "Acme, Inc."},
    )

    system_blob = " ".join(
        m["content"] for m in captured["messages"] if m["role"] == "system"
    )
    assert "Acme, Inc." in system_blob


def test_chat_reports_ready_to_download(signed_in, with_key, monkeypatch):
    filled = {
        "partyOneName": "Acme, Inc.",
        "partyTwoName": "Beta LLC",
        "purpose": "Evaluating a deal",
        "effectiveDate": "2026-09-06",
        "governingLaw": "Delaware",
        "jurisdiction": "courts in New Castle, DE",
    }
    monkeypatch.setattr(
        llm,
        "completion",
        lambda **_: _FakeResponse(
            _reply_json(reply="You can download it now.", fields=filled, ready=True)
        ),
    )

    r = _post_chat(signed_in)
    assert r.status_code == 200
    assert r.json()["readyToDownload"] is True


def test_chat_requires_authentication(client):
    r = _post_chat(client)
    assert r.status_code == 401


def test_chat_502_when_api_key_missing(signed_in, monkeypatch):
    from app.config import get_settings

    monkeypatch.setenv("OPENROUTER_API_KEY", "")
    get_settings.cache_clear()
    try:
        # completion must never be called without a key.
        monkeypatch.setattr(
            llm,
            "completion",
            lambda **_: pytest.fail("completion called without an API key"),
        )
        r = _post_chat(signed_in)
        assert r.status_code == 502
        assert "unavailable" in r.json()["detail"].lower()
    finally:
        get_settings.cache_clear()


def test_chat_502_when_model_call_fails(signed_in, with_key, monkeypatch):
    def boom(**_):
        raise RuntimeError("upstream 500")

    monkeypatch.setattr(llm, "completion", boom)

    r = _post_chat(signed_in)
    assert r.status_code == 502


def test_chat_502_on_malformed_model_output(signed_in, with_key, monkeypatch):
    monkeypatch.setattr(
        llm, "completion", lambda **_: _FakeResponse("not json at all")
    )

    r = _post_chat(signed_in)
    assert r.status_code == 502


def test_chat_rejects_empty_message_list(signed_in, with_key):
    r = signed_in.post("/api/chat", json={"messages": [], "fields": EMPTY_FIELDS})
    assert r.status_code == 422


def test_chat_rejects_bad_role(signed_in, with_key):
    r = signed_in.post(
        "/api/chat",
        json={
            "messages": [{"role": "system", "content": "hi"}],
            "fields": EMPTY_FIELDS,
        },
    )
    assert r.status_code == 422
