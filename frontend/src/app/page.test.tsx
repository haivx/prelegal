import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { NdaCreator } from "./page";
import * as downloadPdf from "@/lib/download-pdf";

vi.mock("@/lib/download-pdf", () => ({
  downloadElementAsPdf: vi.fn(),
}));

const downloadElementAsPdfMock = vi.mocked(downloadPdf.downloadElementAsPdf);

afterEach(() => {
  downloadElementAsPdfMock.mockReset();
});

/**
 * The download button is a native `type="submit"` inside a `<form>`, so the
 * browser blocks submission (and `handleSubmit` never runs) until every
 * `required` field has a value. Fill them in before exercising the submit
 * flow in tests below.
 */
async function fillRequiredFields(user: UserEvent) {
  await user.type(screen.getByLabelText(/party 1 name/i), "Acme, Inc.");
  await user.type(screen.getByLabelText(/party 2 name/i), "Beta LLC");
  await user.type(screen.getByLabelText(/governing law/i), "Delaware");
  await user.type(
    screen.getByLabelText(/^jurisdiction$/i),
    "courts located in New Castle, DE"
  );
}

describe("Home page", () => {
  it("updates the live preview as the form is filled in", async () => {
    const user = userEvent.setup();
    render(<NdaCreator />);

    expect(screen.getByText("[Party 1]")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/party 1 name/i), "Acme, Inc.");

    expect(screen.queryByText("[Party 1]")).not.toBeInTheDocument();
    expect(screen.getByText("Acme, Inc.")).toBeInTheDocument();
  });

  it("downloads a PDF named after both parties when the form is submitted", async () => {
    downloadElementAsPdfMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<NdaCreator />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /download pdf/i }));

    await waitFor(() => expect(downloadElementAsPdfMock).toHaveBeenCalledTimes(1));
    const [, filename] = downloadElementAsPdfMock.mock.calls[0];
    expect(filename).toBe("Mutual-NDA-Acme-Inc-Beta-LLC.pdf");
  });

  it("shows an error message and re-enables the button if PDF generation fails", async () => {
    downloadElementAsPdfMock.mockRejectedValueOnce(new Error("canvas failed"));
    const user = userEvent.setup();
    render(<NdaCreator />);

    await fillRequiredFields(user);
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

    await fillRequiredFields(user);
    const button = screen.getByRole("button", { name: /download pdf/i });
    await user.click(button);

    expect(await screen.findByRole("button", { name: /preparing pdf/i })).toBeDisabled();

    resolveDownload();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /download pdf/i })
      ).toBeEnabled()
    );
  });
});
