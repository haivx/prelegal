import json

import pytest

import app.llm as llm

GOOD_USER = {"email": "founder@acmecorp.com", "password": "correct horse battery"}


class _FakeResponse:
    """Mimics the shape of a litellm completion response."""

    def __init__(self, content: str):
        message = type("Msg", (), {"content": content})()
        choice = type("Choice", (), {"message": message})()
        self.choices = [choice]


def _reply_json(*, reply="What document do you need?", document_id=None, fields=None, ready=False):
    payload = {
        "reply": reply,
        "documentId": document_id,
        "fields": fields or [],
        "readyToDownload": ready,
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
    return client.post("/api/chat", json=body)


def test_chat_returns_reply_document_and_fields(signed_in, with_key, monkeypatch):
    captured = {}

    def fake_completion(**kwargs):
        captured.update(kwargs)
        return _FakeResponse(
            _reply_json(
                reply="Great - what's the purpose?",
                document_id="mutual-nda",
                fields=[{"label": "Purpose", "value": "Evaluating a deal"}],
            )
        )

    monkeypatch.setattr(llm, "completion", fake_completion)

    r = _post_chat(
        signed_in, messages=[{"role": "user", "content": "I need an NDA"}]
    )

    assert r.status_code == 200
    body = r.json()
    assert body["reply"] == "Great - what's the purpose?"
    assert body["documentId"] == "mutual-nda"
    assert body["fields"] == [{"label": "Purpose", "value": "Evaluating a deal"}]
    assert body["readyToDownload"] is False

    assert captured["model"] == "openrouter/openai/gpt-oss-120b"
    assert captured["extra_body"] == {"provider": {"order": ["cerebras"]}}
    assert captured["api_key"] == "test-key"
    # The system prompt always lists the catalog.
    system = captured["messages"][0]
    assert system["role"] == "system"
    assert "Cloud Service Agreement" in system["content"]
    assert "mutual-nda -" in system["content"]


def test_chat_includes_chosen_template_fields_in_the_prompt(
    signed_in, with_key, monkeypatch
):
    captured = {}
    monkeypatch.setattr(
        llm,
        "completion",
        lambda **kw: captured.update(kw) or _FakeResponse(_reply_json()),
    )

    _post_chat(
        signed_in,
        documentId="sla",
        fields=[{"label": "Target Uptime", "value": "99.9%"}],
    )

    system = captured["messages"][0]["content"]
    assert "Service Level Agreement" in system
    assert "Target Response Time" in system  # a fill-in label for the SLA
    assert "99.9%" in system  # values captured so far are echoed back


def test_chat_tolerates_unknown_document_id(signed_in, with_key, monkeypatch):
    monkeypatch.setattr(
        llm, "completion", lambda **_: _FakeResponse(_reply_json())
    )
    r = _post_chat(signed_in, documentId="not-a-real-doc")
    assert r.status_code == 200


def test_chat_reports_ready_to_download(signed_in, with_key, monkeypatch):
    monkeypatch.setattr(
        llm,
        "completion",
        lambda **_: _FakeResponse(
            _reply_json(
                reply="You can download it now.",
                document_id="mutual-nda",
                fields=[
                    {"label": "Purpose", "value": "Evaluating a deal"},
                    {"label": "Effective Date", "value": "2026-09-06"},
                    {"label": "Governing Law", "value": "Delaware"},
                    {"label": "Jurisdiction", "value": "New Castle, DE"},
                ],
                ready=True,
            )
        ),
    )

    r = _post_chat(signed_in, documentId="mutual-nda")
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
    assert _post_chat(signed_in).status_code == 502


def test_chat_502_on_malformed_model_output(signed_in, with_key, monkeypatch):
    monkeypatch.setattr(
        llm, "completion", lambda **_: _FakeResponse("not json at all")
    )
    assert _post_chat(signed_in).status_code == 502


def test_chat_rejects_empty_message_list(signed_in, with_key):
    assert signed_in.post("/api/chat", json={"messages": []}).status_code == 422


def test_chat_rejects_bad_role(signed_in, with_key):
    r = signed_in.post(
        "/api/chat",
        json={"messages": [{"role": "system", "content": "hi"}]},
    )
    assert r.status_code == 422
