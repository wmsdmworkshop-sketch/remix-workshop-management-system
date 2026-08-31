import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// SEC: /api/v2/graph auth gate — wiring contract test.
//
// server.ts binds a port on import (app.listen at the bottom) and needs a live
// DB, so it cannot be booted inside a unit test. This suite instead asserts the
// WIRING contract directly against the source, which is exactly what the
// security fix changed:
//   1. /api/v2/graph is no longer in the PUBLIC_API_PATHS whitelist, so the
//      global authenticateToken gate now covers every /api/v2/graph/* endpoint.
//   2. AICopilotPanel attaches staffAuthHeaders() to every graph call so the
//      gate is satisfied in-app (the panel is rendered inside the authed app).
// ---------------------------------------------------------------------------

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SERVER_SRC = readFileSync(new URL("../../server.ts", import.meta.url), "utf8");
const PANEL_SRC = readFileSync(new URL("../../src/components/AICopilotPanel.tsx", import.meta.url), "utf8");

describe("SEC: /api/v2/graph auth gate", () => {
  it("removes /api/v2/graph from the PUBLIC_API_PATHS whitelist", () => {
    const m = SERVER_SRC.match(/const PUBLIC_API_PATHS = \[([\s\S]*?)\];/);
    expect(m, "PUBLIC_API_PATHS array not found in server.ts").toBeTruthy();
    const whitelist = m![1];
    expect(whitelist).not.toContain("/api/v2/graph");
  });

  it("keeps the global gate enforcing authenticateToken for non-whitelisted /api paths", () => {
    expect(SERVER_SRC).toContain("return authenticateToken(req, res, next);");
  });

  it("AICopilotPanel attaches staffAuthHeaders() to every /api/v2/graph fetch", () => {
    const chunks = PANEL_SRC.split("fetch(").slice(1);
    const graphChunks = chunks.filter((c) => c.includes("/api/v2/graph"));
    expect(graphChunks.length).toBeGreaterThan(0);
    for (const chunk of graphChunks) {
      expect(chunk, "a /api/v2/graph fetch is missing staffAuthHeaders()").toContain("staffAuthHeaders");
    }
  });

  it("still resolves the approve user id from the authenticated session (no placeholder)", () => {
    expect(PANEL_SRC).toContain("getStaffUserId()");
    expect(PANEL_SRC).toContain("You must be signed in to approve a recommendation.");
  });
});
