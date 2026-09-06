"""Legal-agreement catalog endpoints (PREL-6).

`GET /api/documents` lists the agreements the assistant can generate;
`GET /api/documents/{id}` returns one template's markdown and its fill-in
labels so the frontend can render a live preview.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.catalog import load_catalog, get_template
from app.models import User
from app.routers.auth import current_user

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DocumentSummary(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    name: str
    description: str


class DocumentDetail(DocumentSummary):
    template_markdown: str
    fields: list[str]


@router.get("", response_model=list[DocumentSummary])
def list_documents(_user: User = Depends(current_user)) -> list[DocumentSummary]:
    return [
        DocumentSummary(id=e.id, name=e.name, description=e.description)
        for e in load_catalog()
    ]


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(
    document_id: str, _user: User = Depends(current_user)
) -> DocumentDetail:
    template = get_template(document_id)
    if template is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown document")
    return DocumentDetail(
        id=template.id,
        name=template.name,
        description=template.description,
        template_markdown=template.template_markdown,
        fields=template.fields,
    )
