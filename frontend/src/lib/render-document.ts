/**
 * Renders a catalog template to HTML for the live preview (PREL-6).
 *
 * Every Common Paper template is standard-terms markdown with fill-in
 * placeholders written as `<span class="{something}_link">Label</span>`. We
 * replace each with an opaque marker, render the (trusted) template markdown,
 * then splice the captured values into the HTML - after parsing, so a value
 * can never be interpreted as markdown. Values are HTML-escaped.
 */
import { marked } from "marked";
import type { DocumentTemplate, FieldValues } from "@/types/document";

const PLACEHOLDER_RE =
  /<span class="(?:coverpage|orderform|keyterms|businessterms|sow)_link"[^>]*>([^<]+)<\/span>/g;

// Private-use characters: passed through verbatim by marked, absent from the
// (plain-ASCII) templates.
const MARK_OPEN = "\uE000";
const MARK_CLOSE = "\uE001";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripPossessive(label: string): string {
  return label.replace(/[’']s$/, "").trim();
}

function slotHtml(rawLabel: string, values: Map<string, string>): string {
  const label = stripPossessive(rawLabel);
  const value = values.get(label.toLowerCase());
  return value && value.trim() !== ""
    ? `<mark class="doc-fill">${escapeHtml(value)}</mark>`
    : `<span class="doc-blank">[${escapeHtml(label)}]</span>`;
}

export function renderDocumentHtml(
  template: DocumentTemplate,
  values: FieldValues
): string {
  const byKey = new Map(
    Object.entries(values).map(([label, value]) => [label.toLowerCase(), value])
  );

  const slots: string[] = [];
  const tokenized = template.templateMarkdown.replace(
    PLACEHOLDER_RE,
    (_match, rawLabel: string) => {
      slots.push(slotHtml(rawLabel, byKey));
      return `${MARK_OPEN}${slots.length - 1}${MARK_CLOSE}`;
    }
  );

  const html = marked.parse(tokenized, { async: false });
  return html.replace(
    new RegExp(`${MARK_OPEN}(\\d+)${MARK_CLOSE}`, "g"),
    (_match, index: string) => slots[Number(index)]
  );
}
