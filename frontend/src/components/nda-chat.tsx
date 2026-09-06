"use client";

import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { sendChat, type ChatMessage } from "@/lib/chat";
import type { NdaFieldsPatch, NdaFormData } from "@/types/nda";

interface NdaChatProps {
  /** Current form data, sent with each turn so the AI has full context. */
  data: NdaFormData;
  /** Called with the fields the AI extracted from the latest turn. */
  onFieldsPatch: (patch: NdaFieldsPatch) => void;
}

const GREETING =
  "Hi! I'll help you put together a Common Paper Mutual NDA. To start, " +
  "who are the two companies entering into this agreement?";

export function NdaChat({ data, onFieldsPatch }: NdaChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  function scrollToLatest() {
    // Defer until the new message has been painted.
    requestAnimationFrame(() => {
      const log = logRef.current;
      if (log) log.scrollTop = log.scrollHeight;
    });
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || pending) return;

    const history: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(history);
    setInput("");
    setError(null);
    setPending(true);
    scrollToLatest();

    try {
      const result = await sendChat(history, data);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply },
      ]);
      onFieldsPatch(result.fields);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong reaching the assistant. Please try again."
      );
    } finally {
      setPending(false);
      scrollToLatest();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex h-[70vh] flex-col">
      <div
        ref={logRef}
        role="log"
        aria-label="Conversation with the NDA assistant"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto pr-1"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-[#209dd7] text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {message.content}
            </p>
          </div>
        ))}
        {pending && (
          <p className="text-xs text-slate-500" role="status">
            Assistant is typing…
          </p>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form
        className="mt-3 flex items-end gap-2 border-t border-slate-200 pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          Message the assistant
        </label>
        <textarea
          id="chat-input"
          className="min-h-[2.5rem] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#209dd7] focus:outline-none focus:ring-1 focus:ring-[#209dd7]"
          rows={2}
          placeholder="Type your answer…"
          value={input}
          disabled={pending}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          disabled={pending || input.trim() === ""}
          className="shrink-0 rounded-md bg-[#753991] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5f2e74] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
