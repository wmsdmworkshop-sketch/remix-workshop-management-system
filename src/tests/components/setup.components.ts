import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Setup for P1 component acceptance tests.
 *
 * Isolation contract enforced here:
 *  - `fetch` is stubbed by default and FAILS the test if a spec does not
 *    explicitly define the response it expects. A component must never reach a
 *    real network during these tests.
 *  - `alert` is captured rather than executed, so outcome assertions (D-5) can
 *    inspect exactly what the user was told.
 *  - `localStorage` is present via jsdom; nothing reads a real token.
 *
 * No database, no server, no scheduler is touched — the components under test
 * import none of them.
 */

declare global {
  // eslint-disable-next-line no-var
  var __alerts: string[];
}

beforeEach(() => {
  globalThis.__alerts = [];
  vi.stubGlobal("alert", (msg?: any) => {
    globalThis.__alerts.push(String(msg ?? ""));
  });

  // Default: any unmocked call is a test failure, not a silent pass.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any) => {
      throw new Error(
        `Unmocked fetch in a component test: ${String(input)} — stub it in the spec.`
      );
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
