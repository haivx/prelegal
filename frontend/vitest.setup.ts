import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library's built-in auto-cleanup only registers itself when
// it finds a *global* `afterEach` (e.g. Vitest's `test.globals: true`). This
// project imports test APIs explicitly instead, so register cleanup here to
// unmount each test's render and reset the DOM between tests.
afterEach(() => {
  cleanup();
});
