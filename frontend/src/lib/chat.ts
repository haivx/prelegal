/**
 * Client for the AI chat that drafts a legal agreement (PREL-5, PREL-6).
 *
 * The chat is stateless on the server: we keep the full transcript here and
 * replay it on every turn, along with the document settled on so far and
 * the fill-in values captured, so the AI doesn't re-ask for what it knows.
 */
import { apiFetch } from "@/lib/api";
import type { FieldValue } from "@/types/document";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatDraft {
  /** Catalog id of the document chosen so far, or null. */
  documentId: string | null;
  /** Fill-in values captured so far. */
  fields: FieldValue[];
}

export interface ChatReply {
  /** The assistant's next message to show in the transcript. */
  reply: string;
  /** Catalog id the conversation has settled on (null until chosen). */
  documentId: string | null;
  /** Fill-in values the AI has extracted so far. */
  fields: FieldValue[];
  /** Whether a document is chosen and its core fields are filled. */
  readyToDownload: boolean;
}

export function sendChat(
  messages: ChatMessage[],
  draft: ChatDraft
): Promise<ChatReply> {
  return apiFetch<ChatReply>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages, ...draft }),
  });
}
