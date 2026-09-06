"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocumentChat } from "@/components/document-chat";
import { DocumentPreview } from "@/components/document-preview";
import { AccountBar } from "@/components/account-bar";
import { RequireAuth } from "@/components/require-auth";
import type { ChatReply } from "@/lib/chat";
import { fetchDocument, fetchDocuments } from "@/lib/documents";
import { downloadElementAsPdf } from "@/lib/download-pdf";
import { slugifyForFilename } from "@/lib/filename";
import {
  isReadyToDownload,
  mergeFieldList,
  toValues,
  type CatalogDocument,
  type DocumentTemplate,
  type FieldValue,
} from "@/types/document";

/** The platform, gated behind the login screen. */
export default function HomePage() {
  return (
    <RequireAuth>
      <AccountBar />
      <DocumentCreator />
    </RequireAuth>
  );
}

export function DocumentCreator() {
  const [catalog, setCatalog] = useState<CatalogDocument[] | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [fields, setFields] = useState<FieldValue[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  // Load the catalog once for the chat's opening message.
  useEffect(() => {
    let active = true;
    fetchDocuments()
      .then((docs) => active && setCatalog(docs))
      .catch(() => active && setCatalog([]));
    return () => {
      active = false;
    };
  }, []);

  // Load the template whenever the chat settles on a different document.
  // `documentId` only ever moves from null to a value and never back, so
  // there's nothing to tear down here.
  useEffect(() => {
    if (!documentId || template?.id === documentId) return;
    let active = true;
    fetchDocument(documentId)
      .then((loaded) => active && setTemplate(loaded))
      .catch(
        () =>
          active &&
          setError("Couldn't load that document template. Please try again.")
      );
    return () => {
      active = false;
    };
  }, [documentId, template?.id]);

  const values = useMemo(
    () => toValues(fields, template?.fields),
    [fields, template]
  );
  const ready = isReadyToDownload(template, values);

  const handleReply = useCallback((reply: ChatReply) => {
    if (reply.documentId) setDocumentId(reply.documentId);
    if (reply.fields.length > 0) {
      setFields((current) => mergeFieldList(current, reply.fields));
    }
  }, []);

  async function handleDownload() {
    if (!documentRef.current || !template || !ready) return;

    setIsDownloading(true);
    setError(null);
    try {
      const filename = `${slugifyForFilename(template.name, "agreement")}.pdf`;
      await downloadElementAsPdf(documentRef.current, filename);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      setError("Something went wrong generating the PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Legal Agreement Creator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Chat with the assistant to pick one of our Common Paper templates
            and fill it in, previewed live and ready to download as a PDF.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-8 lg:h-fit">
          {catalog === null ? (
            <p className="text-sm text-slate-500" role="status">
              Loading…
            </p>
          ) : (
            <DocumentChat
              catalog={catalog}
              documentId={documentId}
              fields={fields}
              onReply={handleReply}
            />
          )}

          <div className="mt-6 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading || !ready}
              className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloading ? "Preparing PDF…" : "Download PDF"}
            </button>
            {!ready && (
              <p className="mt-2 text-xs text-slate-500">
                {template
                  ? "The assistant still needs a few core details before this document can be downloaded."
                  : "Pick a document with the assistant to get started."}
              </p>
            )}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
            <DocumentPreview
              template={template}
              values={values}
              ref={documentRef}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
