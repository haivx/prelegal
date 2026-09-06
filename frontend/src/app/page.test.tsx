import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { DocumentCreator } from "./page";
import * as downloadPdf from "@/lib/download-pdf";
import * as documentsApi from "@/lib/documents";
import { sendChat } from "@/lib/chat";

vi.mock("@/lib/download-pdf", () => ({ downloadElementAsPdf: vi.fn() }));
vi.mock("@/lib/chat", () => ({ sendChat: vi.fn() }));
vi.mock("@/lib/documents", () => ({
  fetchDocuments: vi.fn(),
  fetchDocument: vi.fn(),
}));

const downloadMock = vi.mocked(downloadPdf.downloadElementAsPdf);
const sendChatMock = vi.mocked(sendChat);
const fetchDocumentsMock = vi.mocked(documentsApi.fetchDocuments);
const fetchDocumentMock = vi.mocked(documentsApi.fetchDocument);

const CATALOG = [
  { id: "mutual-nda", name: "Mutual NDA", description: "NDA standard terms." },
  { id: "csa", name: "Cloud Service Agreement", description: "SaaS terms." },
];

const NDA_TEMPLATE = {
  id: "mutual-nda",
  name: "Mutual NDA",
  description: "Common Paper mutual NDA standard terms.",
  templateMarkdown:
    '# Standard Terms\n\n1. Commences on the <span class="coverpage_link">Effective Date</span>.',
  fields: ["Purpose", "Effective Date", "Governing Law", "Jurisdiction"],
};

const CORE_FIELDS = [
  { label: "Purpose", value: "Evaluating a deal" },
  { label: "Effective Date", value: "2026-09-06" },
  { label: "Governing Law", value: "Delaware" },
  { label: "Jurisdiction", value: "New Castle, DE" },
];

beforeEach(() => {
  fetchDocumentsMock.mockResolvedValue(CATALOG);
  fetchDocumentMock.mockResolvedValue(NDA_TEMPLATE);
});

afterEach(() => {
  vi.clearAllMocks();
});

let turn = 0;

async function chatTurn(
  user: UserEvent,
  {
    documentId = null as string | null,
    fields = [] as { label: string; value: string }[],
    ready = false,
  }
) {
  const reply = `Assistant reply #${++turn}`;
  sendChatMock.mockResolvedValueOnce({
    reply,
    documentId,
    fields,
    readyToDownload: ready,
  });
  await user.type(
    screen.getByLabelText(/message the assistant/i),
    "here are the details"
  );
  await user.click(screen.getByRole("button", { name: /send/i }));
  await screen.findByText(reply);
}

async function renderReady() {
  render(<DocumentCreator />);
  await screen.findByText(/help you draft any of these agreements/i);
}

describe("DocumentCreator", () => {
  it("renders a live preview once the chat picks a document", async () => {
    const user = userEvent.setup();
    await renderReady();

    expect(
      screen.getByText(/tell the assistant which agreement you need/i)
    ).toBeInTheDocument();

    await chatTurn(user, { documentId: "mutual-nda" });

    expect(fetchDocumentMock).toHaveBeenCalledWith("mutual-nda");
    expect(
      await screen.findByText("Common Paper mutual NDA standard terms.")
    ).toBeInTheDocument();
    expect(screen.getByText("Standard Terms")).toBeInTheDocument();
    // Unfilled placeholder shows as a bracketed blank.
    expect(screen.getByText("[Effective Date]")).toBeInTheDocument();
  });

  it("keeps the download button disabled until the core fields are filled", async () => {
    const user = userEvent.setup();
    await renderReady();

    const button = screen.getByRole("button", { name: /download pdf/i });
    expect(button).toBeDisabled();

    await chatTurn(user, { documentId: "mutual-nda" });
    await screen.findByText("Common Paper mutual NDA standard terms.");
    expect(button).toBeDisabled();

    await chatTurn(user, { fields: CORE_FIELDS, ready: true });
    expect(button).toBeEnabled();
  });

  it("downloads a PDF named after the chosen document", async () => {
    downloadMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await renderReady();

    await chatTurn(user, { documentId: "mutual-nda" });
    await chatTurn(user, { fields: CORE_FIELDS, ready: true });
    await user.click(screen.getByRole("button", { name: /download pdf/i }));

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    expect(downloadMock.mock.calls[0][1]).toBe("Mutual-NDA.pdf");
  });

  it("surfaces an error if the template fails to load", async () => {
    fetchDocumentMock.mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    await renderReady();

    await chatTurn(user, { documentId: "mutual-nda" });

    expect(
      await screen.findByText(/couldn't load that document template/i)
    ).toBeInTheDocument();
  });

  it("shows an error and re-enables the button if PDF generation fails", async () => {
    downloadMock.mockRejectedValueOnce(new Error("canvas failed"));
    const user = userEvent.setup();
    await renderReady();

    await chatTurn(user, { documentId: "mutual-nda" });
    await chatTurn(user, { fields: CORE_FIELDS, ready: true });
    const button = screen.getByRole("button", { name: /download pdf/i });
    await user.click(button);

    expect(
      await screen.findByText(/something went wrong generating the pdf/i)
    ).toBeInTheDocument();
    expect(button).toBeEnabled();
  });
});
