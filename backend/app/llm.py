"""AI chat that drives the Mutual NDA (PREL-5).

A single structured LLM call per turn does three jobs at once: it produces
the assistant's next chat message, extracts every NDA field it can from the
conversation so far, and reports whether enough is known to generate the
document. The call goes through LiteLLM -> OpenRouter -> ``gpt-oss-120b``
with Cerebras as the inference provider (see project CLAUDE.md).

Field names on the wire are the camelCase keys the frontend already uses
for its ``NdaFormData`` (parties, term, governing law, ...), so the browser
can merge ``fields`` straight into its form state.
"""

from __future__ import annotations

from typing import Literal

from litellm import completion
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.config import get_settings

MODEL = "openrouter/openai/gpt-oss-120b"
# Route the request to Cerebras specifically (project requirement).
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

# Fields that must be known before the NDA can be downloaded. Kept in sync
# with the frontend's isReadyToDownload() check.
REQUIRED_FIELDS = (
    "partyOneName",
    "partyTwoName",
    "purpose",
    "effectiveDate",
    "governingLaw",
    "jurisdiction",
)

SYSTEM_PROMPT = """\
You are an assistant that helps a user fill out a Common Paper Mutual \
Non-Disclosure Agreement (MNDA) through conversation. The user cannot see a \
form - talk them through it.

Guidelines:
- Ask about one thing at a time, in plain, friendly language. Do not dump \
the whole list of fields at once.
- Only the Mutual NDA is available. If the user asks for another document, \
say so and steer back.
- After each user message, put everything you can infer into `fields`. \
Leave anything still unknown as null - never invent names, dates, or places.
- `effectiveDate` must be an ISO date (YYYY-MM-DD). If the user says \
"today", resolve it. `mndaTermType` is "expires" or "perpetual"; \
`confidentialityTermType` is "years" or "perpetuity". The `*Years` fields \
are integers and only matter for the "expires"/"years" cases.
- `modifications` is optional free text for changes to the standard terms; \
leave it null unless the user asks for one.
- Set `readyToDownload` to true once partyOneName, partyTwoName, purpose, \
effectiveDate, governingLaw and jurisdiction are all filled in. When it \
first becomes true, tell the user they can download the PDF.
- `reply` is your next message to the user. Keep it short.
"""


class NdaFields(BaseModel):
    """Every NDA value the model has captured so far; unknowns are null.

    Attribute names mirror the frontend's ``NdaFormData`` via a camelCase
    alias so the JSON on the wire matches the browser's form state.
    """

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )

    party_one_name: str | None
    party_two_name: str | None
    purpose: str | None
    effective_date: str | None
    mnda_term_type: Literal["expires", "perpetual"] | None
    mnda_term_years: int | None
    confidentiality_term_type: Literal["years", "perpetuity"] | None
    confidentiality_term_years: int | None
    governing_law: str | None
    jurisdiction: str | None
    modifications: str | None


class ChatReply(BaseModel):
    """Structured result of one chat turn."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )

    reply: str = Field(description="The assistant's next message to the user.")
    fields: NdaFields
    ready_to_download: bool


class LlmError(RuntimeError):
    """The chat model could not be reached or returned something unusable."""


def run_chat(
    messages: list[dict[str, str]], current_fields: NdaFields
) -> ChatReply:
    """Run one chat turn and return the assistant reply plus extracted fields.

    ``messages`` is the running user/assistant transcript (no system prompt).
    ``current_fields`` is what the frontend has captured so far, passed back
    so the model does not re-ask for things it already knows.
    """
    api_key = get_settings().openrouter_api_key
    if not api_key:
        raise LlmError("OPENROUTER_API_KEY is not set")

    known = current_fields.model_dump_json(by_alias=True)
    convo = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"Fields captured so far: {known}"},
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
