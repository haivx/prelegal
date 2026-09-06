import pytest

from app.catalog import extract_field_labels

GOOD_USER = {"email": "founder@acmecorp.com", "password": "correct horse battery"}


@pytest.fixture
def signed_in(client):
    assert client.post("/api/auth/signup", json=GOOD_USER).status_code == 201
    return client


def test_list_documents_returns_the_catalog(signed_in):
    r = signed_in.get("/api/documents")
    assert r.status_code == 200
    docs = r.json()
    assert len(docs) == 12
    by_id = {d["id"]: d for d in docs}
    assert "mutual-nda" in by_id
    assert by_id["csa"]["name"] == "Cloud Service Agreement"
    assert set(docs[0]) == {"id", "name", "description"}


def test_get_document_returns_markdown_and_fields(signed_in):
    r = signed_in.get("/api/documents/mutual-nda")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == "mutual-nda"
    assert "Mutual Non-Disclosure Agreement" in body["templateMarkdown"]
    assert body["fields"] == [
        "Purpose",
        "Effective Date",
        "MNDA Term",
        "Term of Confidentiality",
        "Governing Law",
        "Jurisdiction",
    ]


def test_get_unknown_document_is_404(signed_in):
    assert signed_in.get("/api/documents/nope").status_code == 404


def test_documents_require_authentication(client):
    assert client.get("/api/documents").status_code == 401
    assert client.get("/api/documents/mutual-nda").status_code == 401


def test_extract_field_labels_dedupes_possessives_and_keeps_order():
    md = (
        '<span class="keyterms_link">Provider</span> and '
        '<span class="keyterms_link">Customer</span> ... '
        '<span class="keyterms_link">Customer’s</span> data ... '
        '<span class="orderform_link">Effective Date</span> ... '
        "<span class=\"keyterms_link\">Provider's</span> ... "
        '<span class="sow_link">Deliverable</span> vs '
        '<span class="sow_link">Deliverables</span>'
    )
    assert extract_field_labels(md) == [
        "Provider",
        "Customer",
        "Effective Date",
        "Deliverable",
        "Deliverables",
    ]


def test_extract_field_labels_ignores_non_link_spans():
    md = '<span class="header_2">AI Services</span> plain text'
    assert extract_field_labels(md) == []
