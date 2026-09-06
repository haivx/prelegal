import { describe, expect, it } from "vitest";
import { renderDocumentHtml } from "./render-document";
import type { DocumentTemplate } from "@/types/document";

function template(markdown: string, fields: string[] = []): DocumentTemplate {
  return {
    id: "doc",
    name: "Doc",
    description: "…",
    templateMarkdown: markdown,
    fields,
  };
}

describe("renderDocumentHtml", () => {
  it("renders markdown structure to HTML", () => {
    const html = renderDocumentHtml(
      template("# Standard Terms\n\n1. First clause."),
      {}
    );
    expect(html).toContain("<h1>Standard Terms</h1>");
    expect(html).toContain("<li>First clause.</li>");
  });

  it("replaces a filled placeholder with a highlighted value", () => {
    const html = renderDocumentHtml(
      template('Governed by <span class="coverpage_link">Governing Law</span>.'),
      { "Governing Law": "Delaware" }
    );
    expect(html).toContain('<mark class="doc-fill">Delaware</mark>');
    expect(html).not.toContain("Governing Law");
  });

  it("leaves an unfilled placeholder as a bracketed blank", () => {
    const html = renderDocumentHtml(
      template('In <span class="orderform_link">Chosen Courts</span>.'),
      {}
    );
    expect(html).toContain('<span class="doc-blank">[Chosen Courts]</span>');
  });

  it("matches possessive placeholders against the base label", () => {
    const html = renderDocumentHtml(
      template("<span class=\"keyterms_link\">Provider's</span> duties"),
      { Provider: "Acme, Inc." }
    );
    expect(html).toContain('<mark class="doc-fill">Acme, Inc.</mark>');
  });

  it("handles every placeholder span class", () => {
    const md = [
      '<span class="coverpage_link">A</span>',
      '<span class="orderform_link">B</span>',
      '<span class="keyterms_link">C</span>',
      '<span class="businessterms_link">D</span>',
      '<span class="sow_link">E</span>',
    ].join(" ");
    const html = renderDocumentHtml(template(md), {});
    for (const label of ["A", "B", "C", "D", "E"]) {
      expect(html).toContain(`<span class="doc-blank">[${label}]</span>`);
    }
  });

  it("escapes values and never lets one become markup or a link", () => {
    const html = renderDocumentHtml(
      template('<span class="keyterms_link">Partner</span>'),
      { Partner: "<img src=x> [click](javascript:alert(1))" }
    );
    // The markup is neutralised and the markdown link stays inert text.
    expect(html).toContain("&lt;img src=x&gt;");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain('href="javascript');
  });

  it("leaves non-placeholder spans (header markers) untouched", () => {
    const html = renderDocumentHtml(
      template('1. <span class="header_2">Overview</span>'),
      {}
    );
    expect(html).toContain('<span class="header_2">Overview</span>');
  });
});
