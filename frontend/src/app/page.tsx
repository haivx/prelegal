"use client";

import { useCallback, useRef, useState } from "react";
import { NdaChat } from "@/components/nda-chat";
import { NdaDocument } from "@/components/nda-document";
import { AccountBar } from "@/components/account-bar";
import { RequireAuth } from "@/components/require-auth";
import { downloadElementAsPdf } from "@/lib/download-pdf";
import { slugifyForFilename } from "@/lib/filename";
import {
  applyNdaFieldsPatch,
  createDefaultNdaFormData,
  isReadyToDownload,
  type NdaFieldsPatch,
  type NdaFormData,
} from "@/types/nda";

/** The platform, gated behind the login screen. */
export default function HomePage() {
  return (
    <RequireAuth>
      <AccountBar />
      <NdaCreator />
    </RequireAuth>
  );
}

export function NdaCreator() {
  const [data, setData] = useState<NdaFormData>(createDefaultNdaFormData());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  const handleFieldsPatch = useCallback((patch: NdaFieldsPatch) => {
    setData((current) => applyNdaFieldsPatch(current, patch));
  }, []);

  const ready = isReadyToDownload(data);

  async function handleDownload() {
    if (!documentRef.current || !ready) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      const partyOneSlug = slugifyForFilename(data.partyOneName, "Party-1");
      const partyTwoSlug = slugifyForFilename(data.partyTwoName, "Party-2");
      const filename = `Mutual-NDA-${partyOneSlug}-${partyTwoSlug}.pdf`;
      await downloadElementAsPdf(documentRef.current, filename);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      setDownloadError(
        "Something went wrong generating the PDF. Please try again."
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Mutual NDA Creator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Chat with the assistant to put together a Common Paper Mutual
            Non-Disclosure Agreement, previewed live and ready to download as
            a PDF.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-8 lg:h-fit">
          <NdaChat data={data} onFieldsPatch={handleFieldsPatch} />

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
                The assistant still needs the parties, purpose, effective
                date, governing law, and jurisdiction before the NDA can be
                downloaded.
              </p>
            )}
            {downloadError && (
              <p className="mt-2 text-sm text-red-600">{downloadError}</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
            <NdaDocument data={data} ref={documentRef} />
          </div>
        </section>
      </main>
    </div>
  );
}
