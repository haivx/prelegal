"""AI chat endpoint for drafting a legal agreement (PREL-5, PREL-6).

Stateless: the browser keeps the transcript and replays it here each turn,
along with the document it has settled on and the fields captured so far.
This endpoint adds the catalog + system prompt, calls the model, and hands
back the structured result.
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.catalog import get_template, load_catalog
from app.llm import ChatReply, FieldValue, LlmError, run_chat
from app.models import User
from app.routers.auth import current_user

router = APIRouter(prefix="/api", tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    # camelCase on the wire; reject unknown keys so a malformed client
    # payload fails loudly.
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )

    messages: list[ChatMessage] = Field(min_length=1, max_length=40)
    document_id: str | None = None
    fields: list[FieldValue] = Field(default_factory=list, max_length=100)


@router.post("/chat", response_model=ChatReply)
def chat(body: ChatRequest, _user: User = Depends(current_user)) -> ChatReply:
    selected = get_template(body.document_id) if body.document_id else None
    transcript = [m.model_dump() for m in body.messages]
    try:
        return run_chat(transcript, load_catalog(), selected, body.fields)
    except LlmError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"AI chat is unavailable: {exc}"
        ) from exc
