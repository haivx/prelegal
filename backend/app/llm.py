"""AI chat that guides a user through drafting a legal agreement (PREL-5, PREL-6).

A single structured LLM call per turn does three jobs at once: it produces
the assistant's next chat message, tracks which catalog document the
conversation has settled on, extracts every fill-in value it can from the
conversation so far, and reports whether enough is known to generate the
document. The call goes through LiteLLM -> OpenRouter -> ``gpt-oss-120b``
with Cerebras as the inference provider (see project CLAUDE.md).
"""

from __future__ import annotations

import json

from litellm import completion
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.catalog import CatalogEntry, DocumentTemplate
from app.config import get_settings

MODEL = "openrouter/openai/gpt-oss-120b"
# Route the request to Cerebras specifically (project requirement).
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

_BASE_PROMPT = """\
You are an assistant that helps a user draft a legal agreement by talking \
them through it. The user cannot see a form.

You can only generate the documents in the catalog below. Work in two phases:

1. Pick the document. If the user has not made it clear which agreement \
they want, ask - and list the catalog options by name as concrete choices. \
If the user asks for something that is not in the catalog (say, an \
employment contract or an MSA), tell them plainly that you cannot generate \
that one, then recommend the closest catalog document by purpose and ask if \
that works. Once it is settled, set `documentId` to that catalog id.

2. Fill it in. Guide the user through the document's core fields - the \
parties, any dates, the governing law and jurisdiction, and the single most \
important commercial term for that kind of agreement. Ask about one thing at \
a time, in plain language, and ALWAYS end your message with a specific \
follow-on question while any core field is still unknown. Give a concrete \
example in each question (e.g. 'like "Delaware"' or 'e.g. "courts located \
in New Castle, DE"'). Put everything you learn into `fields` as \
{label, value} pairs, using the field labels exactly as given. Never invent \
values - leave a field out until the user provides it. Non-core placeholders \
can be left for the user to fill in later.

Set `readyToDownload` to true once a document is chosen and its core fields \
are filled; when it first becomes true, tell the user they can download the \
document. Keep `reply` short.
"""


class FieldValue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    value: str


class ChatReply(BaseModel):
    """Structured result of one chat turn."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )

    reply: str = Field(description="The assistant's next message to the user.")
    document_id: str | None = Field(
        description="Catalog id of the chosen document, or null if undecided."
    )
    fields: list[FieldValue]
    ready_to_download: bool


class LlmError(RuntimeError):
    """The chat model could not be reached or returned something unusable."""


def _build_system_prompt(
    catalog: list[CatalogEntry],
    selected: DocumentTemplate | None,
    current_fields: list[FieldValue],
) -> str:
    lines = [_BASE_PROMPT, "", "Catalog:"]
    lines += [f"- {e.id} - {e.name}: {e.description}" for e in catalog]

    if selected is not None:
        known = json.dumps([f.model_dump() for f in current_fields])
        field_list = ", ".join(selected.fields) or "(this template has no fill-ins)"
        lines += [
            "",
            f"The user has chosen: {selected.name} (id: {selected.id}).",
            f"Fill-in fields for this document: {field_list}",
            f"Values captured so far: {known}",
        ]
    else:
        lines += ["", "No document has been chosen yet."]

    return "\n".join(lines)


def run_chat(
    messages: list[dict[str, str]],
    catalog: list[CatalogEntry],
    selected: DocumentTemplate | None,
    current_fields: list[FieldValue],
) -> ChatReply:
    """Run one chat turn.

    ``messages`` is the running user/assistant transcript (no system prompt).
    ``selected`` is the already-resolved template for the conversation's
    current ``documentId`` (or None), and ``current_fields`` is what the
    frontend has captured so far.
    """
    api_key = get_settings().openrouter_api_key
    if not api_key:
        raise LlmError("OPENROUTER_API_KEY is not set")

    convo = [
        {"role": "system", "content": _build_system_prompt(catalog, selected, current_fields)},
        *messages,
    ]

    try:
        response = completion(
            model=MODEL,
            messages=convo,
            response_format=ChatReply,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
            api_key=api_key,
        )
    except Exception as exc:  # noqa: BLE001 - surfaced to the caller as 502
        raise LlmError(f"Chat model request failed: {exc}") from exc

    content = response.choices[0].message.content
    if not content:
        raise LlmError("Chat model returned an empty response")

    try:
        return ChatReply.model_validate_json(content)
    except ValueError as exc:
        raise LlmError(f"Chat model returned malformed JSON: {exc}") from exc
