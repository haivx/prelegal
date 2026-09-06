"""Legal-agreement catalog and template parsing (PREL-6).

`catalog.json` lists the Common Paper templates in `templates/`. Each
template is standard-terms prose with fill-in placeholders written as
``<span class="{something}_link">Label</span>`` - the class name varies by
which companion document (cover page, order form, key terms, SOW, ...)
supplies the value, but the label text is what the user needs to provide.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from pydantic import BaseModel

from app.config import get_settings

_PLACEHOLDER_RE = re.compile(
    r'<span class="(?:coverpage|orderform|keyterms|businessterms|sow)_link"[^>]*>'
    r"([^<]+)</span>"
)
_POSSESSIVE_RE = re.compile(r"[’']s$")


class CatalogEntry(BaseModel):
    id: str
    name: str
    description: str
    filename: str


class DocumentTemplate(BaseModel):
    id: str
    name: str
    description: str
    template_markdown: str
    fields: list[str]


def _slug(filename: str) -> str:
    return Path(filename).stem.lower()


def load_catalog() -> list[CatalogEntry]:
    path = get_settings().resolved_catalog_path()
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [
        CatalogEntry(
            id=_slug(item["filename"]),
            name=item["name"],
            description=item["description"],
            filename=item["filename"],
        )
        for item in raw
    ]


def get_entry(document_id: str) -> CatalogEntry | None:
    return next((e for e in load_catalog() if e.id == document_id), None)


def extract_field_labels(markdown: str) -> list[str]:
    """Ordered, de-duplicated fill-in labels found in a template.

    Possessive variants ("Customer's") collapse onto the base label, and
    matching is case-insensitive, but otherwise distinct defined terms
    (e.g. "Deliverable" vs "Deliverables") are kept separate.
    """
    seen: dict[str, str] = {}
    for match in _PLACEHOLDER_RE.finditer(markdown):
        label = _POSSESSIVE_RE.sub("", match.group(1).strip())
        key = label.casefold()
        if key and key not in seen:
            seen[key] = label
    return list(seen.values())


def get_template(document_id: str) -> DocumentTemplate | None:
    entry = get_entry(document_id)
    if entry is None:
        return None
    path = get_settings().resolved_templates_dir() / entry.filename
    markdown = path.read_text(encoding="utf-8")
    return DocumentTemplate(
        id=entry.id,
        name=entry.name,
        description=entry.description,
        template_markdown=markdown,
        fields=extract_field_labels(markdown),
    )
