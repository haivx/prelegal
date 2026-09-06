import { describe, expect, it } from "vitest";
import {
  coreLabelsFor,
  isReadyToDownload,
  mergeFieldList,
  toValues,
  type DocumentTemplate,
} from "./document";

function template(fields: string[]): DocumentTemplate {
  return {
    id: "csa",
    name: "Cloud Service Agreement",
    description: "…",
    templateMarkdown: "# CSA",
    fields,
  };
}

describe("mergeFieldList", () => {
  it("adds new values and lets the latest win per label", () => {
    const merged = mergeFieldList(
      [{ label: "Provider", value: "Acme" }],
      [
        { label: "Provider", value: "Acme, Inc." },
        { label: "Customer", value: "Beta LLC" },
      ]
    );
    expect(merged).toEqual([
      { label: "Provider", value: "Acme, Inc." },
      { label: "Customer", value: "Beta LLC" },
    ]);
  });

  it("matches labels case-insensitively and ignores blank values", () => {
    const merged = mergeFieldList(
      [{ label: "Governing Law", value: "Delaware" }],
      [
        { label: "governing law", value: "California" },
        { label: "Jurisdiction", value: "   " },
      ]
    );
    expect(merged).toEqual([{ label: "governing law", value: "California" }]);
  });
});

describe("toValues", () => {
  it("snaps labels onto the template's canonical casing", () => {
    const values = toValues(
      [
        { label: "effective date", value: "2026-09-06" },
        { label: "Governing Law", value: "Delaware" },
      ],
      ["Effective Date", "Governing Law", "Chosen Courts"]
    );
    expect(values).toEqual({
      "Effective Date": "2026-09-06",
      "Governing Law": "Delaware",
    });
  });

  it("keeps unknown labels as-is when there is no template", () => {
    expect(toValues([{ label: "Whatever", value: "x" }])).toEqual({
      Whatever: "x",
    });
  });
});

describe("coreLabelsFor", () => {
  it("returns only the template's labels that are core", () => {
    expect(
      coreLabelsFor(
        template(["Provider", "Customer", "Effective Date", "Use Limitations"])
      )
    ).toEqual(["Provider", "Customer", "Effective Date"]);
  });
});

describe("isReadyToDownload", () => {
  it("is false with no template", () => {
    expect(isReadyToDownload(null, {})).toBe(false);
  });

  it("is false until every core label has a value", () => {
    const t = template(["Provider", "Customer", "Effective Date"]);
    expect(
      isReadyToDownload(t, { Provider: "Acme", Customer: "Beta" })
    ).toBe(false);
    expect(
      isReadyToDownload(t, {
        Provider: "Acme",
        Customer: "Beta",
        "Effective Date": "2026-09-06",
      })
    ).toBe(true);
  });

  it("is ready as soon as it's chosen when the template has no core labels", () => {
    expect(isReadyToDownload(template(["Training Purposes"]), {})).toBe(true);
  });
});
