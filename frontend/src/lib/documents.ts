/** Client for the agreement catalog (PREL-6). */
import { apiFetch } from "@/lib/api";
import type { CatalogDocument, DocumentTemplate } from "@/types/document";

export function fetchDocuments(): Promise<CatalogDocument[]> {
  return apiFetch<CatalogDocument[]>("/api/documents");
}

export function fetchDocument(id: string): Promise<DocumentTemplate> {
  return apiFetch<DocumentTemplate>(
    `/api/documents/${encodeURIComponent(id)}`
  );
}
