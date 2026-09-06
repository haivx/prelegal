import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentChat } from "./document-chat";
import { ApiError } from "@/lib/api";
import { sendChat } from "@/lib/chat";
import type { CatalogDocument } from "@/types/document";

vi.mock("@/lib/chat", () => ({ sendChat: vi.fn() }));

const sendChatMock = vi.mocked(sendChat);

afterEach(() => {
  sendChatMock.mockReset();
});

const CATALOG: CatalogDocument[] = [
  { id: "mutual-nda", name: "Mutual Non-Disclosure Agreement", description: "…" },
  { id: "csa", name: "Cloud Service Agreement", description: "…" },
];

function renderChat(catalog: CatalogDocument[] = CATALOG) {
  const onReply = vi.fn();
  render(
    <DocumentChat
      catalog={catalog}
      documentId={null}
      fields={[]}
      onReply={onReply}
    />
  );
  return { onReply };
}

describe("DocumentChat", () => {
  it("opens by listing the available agreements", () => {
    renderChat();
    expect(
      screen.getByText(/help you draft any of these agreements/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Cloud Service Agreement/)).toBeInTheDocument();
  });

  it("falls back to a generic greeting when the catalog is empty", () => {
    renderChat([]);
    expect(
      screen.getByText(/what kind of document do you need/i)
    ).toBeInTheDocument();
  });

  it("disables Send until the user types something", async () => {
    const user = userEvent.setup();
    renderChat();
    const send = screen.getByRole("button", { name: /send/i });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText(/message the assistant/i), "an NDA");
    expect(send).toBeEnabled();
  });

  it("sends the transcript + draft and forwards the structured reply", async () => {
    sendChatMock.mockResolvedValueOnce({
      reply: "Sure - who are the two parties?",
      documentId: "mutual-nda",
      fields: [{ label: "Purpose", value: "Evaluating a deal" }],
      readyToDownload: false,
    });
    const user = userEvent.setup();
    const { onReply } = renderChat();

    await user.type(
      screen.getByLabelText(/message the assistant/i),
      "I need an NDA"
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("I need an NDA")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText(/who are the two parties/i)
      ).toBeInTheDocument()
    );

    expect(onReply).toHaveBeenCalledWith({
      reply: "Sure - who are the two parties?",
      documentId: "mutual-nda",
      fields: [{ label: "Purpose", value: "Evaluating a deal" }],
      readyToDownload: false,
    });

    const [transcript, draft] = sendChatMock.mock.calls[0];
    expect(transcript[0].role).toBe("assistant");
    expect(transcript.at(-1)).toEqual({ role: "user", content: "I need an NDA" });
    expect(draft).toEqual({ documentId: null, fields: [] });
  });

  it("shows an error and keeps the user message when the request fails", async () => {
    sendChatMock.mockRejectedValueOnce(
      new ApiError(502, "AI chat is unavailable")
    );
    const user = userEvent.setup();
    const { onReply } = renderChat();

    await user.type(screen.getByLabelText(/message the assistant/i), "an NDA");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /ai chat is unavailable/i
    );
    expect(screen.getByText("an NDA")).toBeInTheDocument();
    expect(onReply).not.toHaveBeenCalled();
  });
});
