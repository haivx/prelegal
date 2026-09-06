/** A selectable agreement from the backend catalog. */
export interface CatalogDocument {
  id: string;
  name: string;
  description: string;
}

/** One catalog document plus its template and parsed fill-in labels. */
export interface DocumentTemplate extends CatalogDocument {
  templateMarkdown: string;
  /** Fill-in labels, in document order. */
  fields: string[];
}

/** A single extracted fill-in value from the chat. */
export interface FieldValue {
  label: string;
  value: string;
}

/** label -> value for everything captured so far. */
export type FieldValues = Record<string, string>;

/**
 * Fill-in labels that gate "Download". If a template contains any of these,
 * they must all be filled before the document can be downloaded. Matched
 * case-insensitively against the template's own labels, so a template with
 * none of them (e.g. the NDA cover page) is downloadable as soon as it's
 * chosen. Kept roughly in sync with the backend's guided-core prompt.
 */
const CORE_LABELS = new Set([
  "effective date",
  "governing law",
  "jurisdiction",
  "chosen courts",
  "purpose",
  "customer",
  "provider",
  "partner",
  "company",
  "party 1",
  "party 2",
]);

export function coreLabelsFor(template: DocumentTemplate): string[] {
  return template.fields.filter((label) => CORE_LABELS.has(label.toLowerCase()));
}

/**
 * Fold newly extracted values into the running list: latest value wins per
 * label (case-insensitive), blanks are ignored so the AI can't wipe a field.
 */
export function mergeFieldList(
  current: FieldValue[],
  incoming: FieldValue[]
): FieldValue[] {
  const byKey = new Map(current.map((f) => [f.label.toLowerCase(), f]));
  for (const field of incoming) {
    if (field.label && field.value && field.value.trim() !== "") {
      byKey.set(field.label.toLowerCase(), field);
    }
  }
  return [...byKey.values()];
}

/**
 * Build a label -> value map, snapping each label onto the template's
 * canonical casing when it matches one (the AI is asked to echo labels
 * verbatim, but this keeps a stray "effective date" aligned with
 * "Effective Date").
 */
export function toValues(
  fields: FieldValue[],
  templateFields: string[] = []
): FieldValues {
  const canonical = new Map(
    templateFields.map((label) => [label.toLowerCase(), label])
  );
  const values: FieldValues = {};
  for (const { label, value } of fields) {
    values[canonical.get(label.toLowerCase()) ?? label] = value;
  }
  return values;
}

/** True once a document is chosen and its core labels (if any) are filled. */
export function isReadyToDownload(
  template: DocumentTemplate | null,
  values: FieldValues
): boolean {
  if (!template) return false;
  return coreLabelsFor(template).every(
    (label) => (values[label] ?? "").trim() !== ""
  );
}
