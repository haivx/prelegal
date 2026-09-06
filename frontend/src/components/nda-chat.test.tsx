import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NdaChat } from "./nda-chat";
import { ApiError } from "@/lib/api";
import { sendChat } from "@/lib/chat";
import { createDefaultNdaFormData } from "@/types/nda";

vi.mock("@/lib/chat", () => ({ sendChat: vi.fn() }));

const sendChatMock = vi.mocked(sendChat);

afterEach(() => {
  sendChatMock.mockReset();
});

function renderChat() {
  const data = createDefaultNdaFormData();
  const onFieldsPatch = vi.fn();
  render(<NdaChat data={data} onFieldsPatch={onFieldsPatch} />);
  return { data, onFieldsPatch };
}

describe("NdaChat", () => {
  it("opens with an assistant greeting", () => {
    renderChat();
    expect(
      screen.getByText(/help you put together a Common Paper Mutual NDA/i)
    ).toBeInTheDocument();
  });

  it("disables Send until the user types something", async () => {
    const user = userEvent.setup();
    renderChat();

    const send = screen.getByRole("button", { name: /send/i });
    expect(send).toBeDisabled();

    await user.type(screen.getByLabelText(/message the assistant/i), "Hello");
    expect(send).toBeEnabled();
  });

  it("sends the transcript, shows the reply, and forwards extracted fields", async () => {
    sendChatMock.mockResolvedValueOnce({
      reply: "Great - what's the purpose of sharing information?",
      fields: { partyOneName: "Acme, Inc.", partyTwoName: "Beta LLC" },
      readyToDownload: false,
    });
    const user = userEvent.setup();
    const { data, onFieldsPatch } = renderChat();

    await user.type(
      screen.getByLabelText(/message the assistant/i),
      "Acme and Beta"
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    // User's message is added to the transcript immediately.
    expect(screen.getByText("Acme and Beta")).toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByText(/what's the purpose of sharing information/i)
      ).toBeInTheDocument()
    );

    expect(onFieldsPatch).toHaveBeenCalledWith({
      partyOneName: "Acme, Inc.",
      partyTwoName: "Beta LLC",
    });

    const [transcript, sentData] = sendChatMock.mock.calls[0];
    expect(transcript[0].role).toBe("assistant");
    expect(transcript.at(-1)).toEqual({
      role: "user",
      content: "Acme and Beta",
    });
    expect(sentData).toBe(data);
  });

  it("shows an error and keeps the user message when the request fails", async () => {
    sendChatMock.mockRejectedValueOnce(
      new ApiError(502, "AI chat is unavailable")
    );
    const user = userEvent.setup();
    const { onFieldsPatch } = renderChat();

    await user.type(
      screen.getByLabelText(/message the assistant/i),
      "Acme and Beta"
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /ai chat is unavailable/i
    );
    expect(screen.getByText("Acme and Beta")).toBeInTheDocument();
    expect(onFieldsPatch).not.toHaveBeenCalled();
  });

  it("submits on Enter and not on Shift+Enter", async () => {
    sendChatMock.mockResolvedValue({
      reply: "ok",
      fields: {},
      readyToDownload: false,
    });
    const user = userEvent.setup();
    renderChat();

    const input = screen.getByLabelText(/message the assistant/i);
    await user.type(input, "first{Shift>}{Enter}{/Shift}still typing");
    expect(sendChatMock).not.toHaveBeenCalled();

    await user.type(input, "{Enter}");
    await waitFor(() => expect(sendChatMock).toHaveBeenCalledTimes(1));
  });
});
