/**
 * Client for the AI chat that drafts the Mutual NDA (PREL-5).
 *
 * The chat is stateless on the server: we keep the full transcript here and
 * replay it on every turn, along with the fields captured so far so the AI
 * doesn't re-ask for things it already knows.
 */
import { apiFetch } from "@/lib/api";
import type { NdaFieldsPatch, NdaFormData } from "@/types/nda";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatReply {
  /** The assistant's next message to show in the transcript. */
  reply: string;
  /** NDA fields the AI has extracted so far (nulls mean "still unknown"). */
  fields: NdaFieldsPatch;
  /** Whether every required field is now filled in. */
  readyToDownload: boolean;
}

export function sendChat(
  messages: ChatMessage[],
  fields: NdaFormData
): Promise<ChatReply> {
  return apiFetch<ChatReply>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages, fields }),
  });
}
