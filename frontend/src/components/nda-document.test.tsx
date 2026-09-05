import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NdaDocument } from "./nda-document";
import type { NdaFormData } from "@/types/nda";

const blankData: NdaFormData = {
  partyOneName: "",
  partyTwoName: "",
  purpose: "",
  effectiveDate: "",
  mndaTermType: "expires",
  mndaTermYears: 1,
  confidentialityTermType: "years",
  confidentialityTermYears: 1,
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
};

const filledData: NdaFormData = {
  partyOneName: "Acme, Inc.",
  partyTwoName: "Beta LLC",
  purpose: "Evaluating a potential integration.",
  effectiveDate: "2026-01-15",
  mndaTermType: "expires",
  mndaTermYears: 2,
  confidentialityTermType: "years",
  confidentialityTermYears: 5,
  governingLaw: "Delaware",
  jurisdiction: "courts located in New Castle, DE",
  modifications: "Section 9 is deleted in its entirety.",
};

describe("NdaDocument", () => {
  it("shows bracketed placeholders for every unfilled field", () => {
    render(<NdaDocument data={blankData} />);

    expect(screen.getByText("[Party 1]")).toBeInTheDocument();
    expect(screen.getByText("[Party 2]")).toBeInTheDocument();
    expect(screen.getAllByText("[Purpose]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[Effective Date]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[Governing Law]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[Jurisdiction]").length).toBeGreaterThan(0);
  });

  it("omits the MNDA Modifications row when no modifications were entered", () => {
    render(<NdaDocument data={blankData} />);

    expect(screen.queryByText("MNDA Modifications")).not.toBeInTheDocument();
  });

  it("substitutes filled-in values throughout the cover page and standard terms", () => {
    render(<NdaDocument data={filledData} />);

    expect(screen.getByText("Acme, Inc.")).toBeInTheDocument();
    expect(screen.getByText("Beta LLC")).toBeInTheDocument();
    expect(
      screen.getAllByText("Evaluating a potential integration.").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("January 15, 2026").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("2 year(s) from the Effective Date").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Delaware").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("courts located in New Castle, DE").length
    ).toBeGreaterThan(0);
  });

  it("shows the MNDA Modifications row with the entered text when provided", () => {
    render(<NdaDocument data={filledData} />);

    expect(screen.getByText("MNDA Modifications")).toBeInTheDocument();
    expect(
      screen.getByText("Section 9 is deleted in its entirety.")
    ).toBeInTheDocument();
  });

  it("always renders a blank signature table, even when party info is filled in", () => {
    const { container } = render(<NdaDocument data={filledData} />);

    const cells = container.querySelectorAll("table td");
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach((cell) => {
      expect(cell.textContent).toBe(" ");
    });

    // The parties' names should not have leaked into the signature table.
    const table = container.querySelector("table");
    expect(table?.textContent).not.toMatch(/Acme|Beta/);
  });
});
