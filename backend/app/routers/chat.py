"""AI chat endpoint for drafting the Mutual NDA (PREL-5).

Stateless: the browser keeps the transcript and replays it here each turn,
along with the fields it has captured so far. This endpoint just adds the
system prompt, calls the model, and hands back the structured result.
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.llm import ChatReply, LlmError, NdaFields, run_chat
from app.models import User
from app.routers.auth import current_user

router = APIRouter(prefix="/api", tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    # Reject unknown keys so a malformed client payload fails loudly.
    model_config = ConfigDict(extra="forbid")

    messages: list[ChatMessage] = Field(min_length=1, max_length=40)
    fields: NdaFields


@router.post("/chat", response_model=ChatReply)
def chat(body: ChatRequest, _user: User = Depends(current_user)) -> ChatReply:
    transcript = [m.model_dump() for m in body.messages]
    try:
        return run_chat(transcript, body.fields)
    except LlmError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"AI chat is unavailable: {exc}"
        ) from exc
