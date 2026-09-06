import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { NdaCreator } from "./page";
import * as downloadPdf from "@/lib/download-pdf";
import { sendChat } from "@/lib/chat";

vi.mock("@/lib/download-pdf", () => ({
  downloadElementAsPdf: vi.fn(),
}));
vi.mock("@/lib/chat", () => ({ sendChat: vi.fn() }));

const downloadElementAsPdfMock = vi.mocked(downloadPdf.downloadElementAsPdf);
const sendChatMock = vi.mocked(sendChat);

afterEach(() => {
  downloadElementAsPdfMock.mockReset();
  sendChatMock.mockReset();
});

const ALL_REQUIRED_FIELDS = {
  partyOneName: "Acme, Inc.",
  partyTwoName: "Beta LLC",
  purpose: "Evaluating a potential business relationship",
  effectiveDate: "2026-09-06",
  governingLaw: "Delaware",
  jurisdiction: "courts located in New Castle, DE",
};

/** Simulate one chat turn whose reply carries the given extracted fields.
 * Each turn gets a unique reply string so assertions can target it even
 * after several turns. */
let turnCount = 0;

async function chatTurn(
  user: UserEvent,
  fields: Record<string, unknown>,
  { ready = false }: { ready?: boolean } = {}
) {
  const reply = `Assistant reply #${++turnCount}`;
  sendChatMock.mockResolvedValueOnce({ reply, fields, readyToDownload: ready });
  await user.type(
    screen.getByLabelText(/message the assistant/i),
    "here are the details"
  );
  await user.click(screen.getByRole("button", { name: /send/i }));
  await screen.findByText(reply);
}

describe("NdaCreator", () => {
  it("updates the live preview as the chat extracts fields", async () => {
    const user = userEvent.setup();
    render(<NdaCreator />);

    expect(screen.getByText("[Party 1]")).toBeInTheDocument();

    await chatTurn(user, { partyOneName: "Acme, Inc." });

    expect(screen.queryByText("[Party 1]")).not.toBeInTheDocument();
    expect(screen.getByText("Acme, Inc.")).toBeInTheDocument();
  });

  it("keeps the download button disabled until every required field is filled", async () => {
    const user = userEvent.setup();
    render(<NdaCreator />);

    const button = screen.getByRole("button", { name: /download pdf/i });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/still needs the parties, purpose, effective date/i)
    ).toBeInTheDocument();

    // A partial turn is still not enough.
    await chatTurn(user, { partyOneName: "Acme, Inc.", partyTwoName: "Beta LLC" });
    expect(button).toBeDisabled();

    await chatTurn(user, ALL_REQUIRED_FIELDS, { ready: true });
    expect(button).toBeEnabled();
    expect(
      screen.queryByText(/still needs the parties/i)
    ).not.toBeInTheDocument();
  });

  it("downloads a PDF named after both parties once the fields are in", async () => {
    downloadElementAsPdfMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<NdaCreator />);

    await chatTurn(user, ALL_REQUIRED_FIELDS, { ready: true });
    await user.click(screen.getByRole("button", { name: /download pdf/i }));

    await waitFor(() =>
      expect(downloadElementAsPdfMock).toHaveBeenCalledTimes(1)
    );
    const [, filename] = downloadElementAsPdfMock.mock.calls[0];
    expect(filename).toBe("Mutual-NDA-Acme-Inc-Beta-LLC.pdf");
  });

  it("shows an error message and re-enables the button if PDF generation fails", async () => {
    downloadElementAsPdfMock.mockRejectedValueOnce(new Error("canvas failed"));
    const user = userEvent.setup();
    render(<NdaCreator />);

    await chatTurn(user, ALL_REQUIRED_FIELDS, { ready: true });
    const button = screen.getByRole("button", { name: /download pdf/i });
    await user.click(button);

    expect(
      await screen.findByText(/something went wrong generating the pdf/i)
    ).toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent(/download pdf/i);
  });

  it("disables the download button while generation is in progress", async () => {
    let resolveDownload: () => void = () => {};
    downloadElementAsPdfMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDownload = resolve;
        })
    );
    const user = userEvent.setup();
    render(<NdaCreator />);

    await chatTurn(user, ALL_REQUIRED_FIELDS, { ready: true });
    const button = screen.getByRole("button", { name: /download pdf/i });
    await user.click(button);

    expect(
      await screen.findByRole("button", { name: /preparing pdf/i })
    ).toBeDisabled();

    resolveDownload();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /download pdf/i })
      ).toBeEnabled()
    );
  });
});
