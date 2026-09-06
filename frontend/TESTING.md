# Testing the Mutual NDA Creator

This app has three layers of automated tests, plus a manual checklist for
things automation doesn't cover well. Run everything from `frontend/`.

## Automated tests

| Layer | Tool | Command | What it covers |
|---|---|---|---|
| Unit | Vitest | `npm test` (watch) / `npm run test:run` (CI) | Pure text/formatting helpers in `src/lib` |
| Component | Vitest + React Testing Library | same as above | `NdaForm`, `NdaDocument`, the NDA page's client-side wiring (form → live preview → download call) with `html2pdf.js` mocked out, plus the login screen / `AuthProvider` / auth gate |
| End-to-end | Playwright | `npm run test:e2e` | A real Chromium browser signing up through the fake-login screen, filling in the form, clicking **Download PDF**, and asserting an actual PDF file comes out |

Run all of them, plus type-checking and lint, before opening/updating a PR:

```bash
npm run lint
npm run test:run
npm run build       # also type-checks; emits the static export to out/
npm run test:e2e    # serves out/ + the auth API via the backend
```

Since the frontend is a static export (`output: 'export'`) there is no
`next start`. `test:e2e` starts the **backend** (`uv run uvicorn` on port
3100, see `playwright.config.ts`), which serves the built `out/` bundle and
the `/api` auth endpoints from one origin against a throwaway SQLite DB that
is recreated on startup. It expects `npm run build` to have been run first,
and `uv` + a synced `backend/.venv` (`cd ../backend && uv sync`).

### Why the E2E layer exists

The unit/component tests mock out `downloadElementAsPdf`, so they verify the
UI wiring but never actually exercise `html2pdf.js`/`html2canvas` in a real
browser. The Playwright test is what catches genuine breakage in that
pipeline — it's how we caught and fixed a real bug where Tailwind v4's
wide-gamut (`lab()`) colors made `html2canvas` throw and silently fail the
download on P3 displays (see the `.pdf-color-safe` override in
`src/app/globals.css`). Keep this test whenever the document's styling or
the PDF library changes.

## Manual test checklist

Things worth a human pass before/after a release, that aren't practical (or
not yet automated) to check with the suites above:

### Cross-browser
- [ ] Chrome/Edge (Chromium) — form, live preview, and PDF download
- [ ] Firefox — same, plus check the native required-field validation
      bubble styling
- [ ] Safari — `html2canvas`/`html2pdf.js` has historically had more quirks
      on Safari than Chromium; specifically re-check the PDF download

### Visual / print quality of the generated PDF
- [ ] Open the downloaded PDF and confirm it isn't cut off mid-page in an
      awkward spot (check each `Clause`, the cover page table, and the
      footer attribution)
- [ ] Confirm the signature table renders with visibly blank cells (not
      collapsed/invisible borders) in the PDF, not just on screen
- [ ] Fill in a very long `Purpose` or `MNDA Modifications` (a few
      paragraphs) and confirm the PDF paginates sensibly rather than
      overlapping content
- [ ] Confirm colors in the PDF look correct on a wide-gamut (P3) display —
      this is exactly the class of bug `.pdf-color-safe` fixes

### Accessibility
- [ ] Tab through the entire form using only the keyboard; confirm focus
      order is logical and every control is reachable
- [ ] Verify every input's label is announced correctly with a screen
      reader (VoiceOver/NVDA), especially the MNDA term / confidentiality
      term radio groups
- [ ] Confirm the native validation messages (empty required fields) are
      announced when submission is blocked

### Responsive layout
- [ ] Narrow (mobile) viewport: form and preview stack vertically and
      remain usable; the download button stays reachable
- [ ] Wide (desktop) viewport: form stays sticky while the preview scrolls
      independently

### Data edge cases
- [ ] Party names with commas, periods, or non-ASCII characters (e.g. "株式
      会社") — confirm the live preview shows them correctly and the
      downloaded filename still falls back sensibly (see
      `slugifyForFilename`)
- [ ] Leaving optional fields (MNDA Modifications) blank — confirm that
      section is omitted from the document rather than shown empty
- [ ] Switching MNDA term / confidentiality term between the fixed-years
      and perpetual/perpetuity options right before submitting, to confirm
      the last-selected option (not a stale one) is what's reflected in the
      downloaded PDF
