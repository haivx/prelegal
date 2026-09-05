/**
 * Turns a free-form value into a filesystem-safe slug for use in a
 * downloaded filename, falling back to a default when the value is empty
 * or contains no usable characters (e.g. only whitespace or punctuation).
 */
export function slugifyForFilename(value: string, fallback: string): string {
  const slug = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}
