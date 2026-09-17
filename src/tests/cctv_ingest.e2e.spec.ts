import { test, expect, request as playwrightRequest, APIRequestContext } from "@playwright/test";

/**
 * CCTV & Floor Safety — device → feed, over real HTTP.
 *
 * ── What this suite exists to prove ─────────────────────────────────────────
 *
 * The unit suite (`cctv-ingest.test.ts`) covers ingest SEMANTICS against a fake
 * pool and pins the WIRING contract by reading the source. Neither can prove the
 * thing that actually broke: that a device holding only the shared secret can
 * get PAST the global `/api` JWT gate and reach the route.
 *
 * The generated server registers `app.use("/api", …authenticateToken…)` before
 * this route, and `/api/cctv/alerts/ingest` was missing from
 * `PUBLIC_API_PATHS`. Every device POST was therefore answered **401 by the gate**
 * and the route's own `X-CCTV-Key` check never ran — a camera could not reach the
 * feature however it was configured. Only a real unauthenticated request can
 * tell "the whitelist works" apart from "the whitelist is still missing", so the
 * headline step below deliberately sends NO Authorization header.
 *
 * ── Setup ───────────────────────────────────────────────────────────────────
 *   npx dotenv -e .env.test -- npx tsx test-infra/seed_test_superuser.ts
 *   $env:NODE_ENV='test'; $env:PORT='3001'; npx tsx server.ts      # separate shell
 *   npx dotenv -e .env.test -- npx playwright test src/tests/cctv_ingest.e2e.spec.ts --reporter=list --workers=1
 *
 * Writes only to the isolated `wms_test` schema (`cctv_settings` is a single
 * row; alerts accumulate under a per-run camera ref).
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const SUPERUSER_USERNAME = process.env.E2E_SUPERUSER_USERNAME || "sbx_admin";
const SUPERUSER_PASSWORD = process.env.E2E_SUPERUSER_PASSWORD || "sbx_super_pw";

/**
 * Sandbox-only device secret. Deliberately a published non-secret: it is written
 * to the isolated test schema and never to a real deployment.
 */
const DEVICE_KEY = "e2e-cctv-device-key";

test.describe("CCTV ingest — a device must reach the feed", () => {
  let api: APIRequestContext;
  let token = "";
  /** Unique per run, so a re-run never dedupes against the previous run's rows. */
  let cameraRef = "";

  /** Thin wrapper: attaches the bearer token. Omit to send NO auth (device shape). */
  async function call(method: "get" | "post", path: string, data?: any, opts: { device?: boolean; key?: string } = {}) {
    const headers: Record<string, string> = {};
    if (token && !opts.device) headers.Authorization = `Bearer ${token}`;
    if (opts.key !== undefined) headers["X-CCTV-Key"] = opts.key;
    const res = await api[method](path, { headers, data });
    let body: any = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status(), body };
  }

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({ baseURL: BASE_URL, timeout: 30000 });

    const health = await api.get("/api/health");
    expect(
      health.status(),
      `No server on ${BASE_URL}. Start it with: $env:NODE_ENV='test'; $env:PORT='3001'; npx tsx server.ts`
    ).toBeLessThan(400);

    const login = await api.post("/api/auth/login", {
      data: { username: SUPERUSER_USERNAME, password: SUPERUSER_PASSWORD },
    });
    const body: any = await login.json().catch(() => null);
    expect(
      login.status(),
      `Login as '${SUPERUSER_USERNAME}' failed. Seed it with: npx dotenv -e .env.test -- npx tsx test-infra/seed_test_superuser.ts`
    ).toBe(200);
    expect(body?.user?.role, "the super user must carry the admin role").toBe("admin");

    token = body.token;
    cameraRef = `E2E-CAM-${Date.now()}`;
  });

  test.afterAll(async () => {
    api?.dispose();
  });

  // One test, not eight. Several steps depend on the key stored by an earlier
  // step, and Playwright does not guarantee separate `test()` blocks share a
  // worker — a lost key would fail as a 401 that looks like the original bug.
  test("a camera pushes an alert and an operator sees it in the feed", async () => {
    await test.step("1. configure the shared secret from the app (no deploy, no env var)", async () => {
      const res = await call("post", "/api/cctv/config", {
        webhook_key: DEVICE_KEY,
        enabled: true,
        dedupe_seconds: 0, // commissioning mode: every event must land
      });
      expect(res.status, "admin may write CCTV settings").toBe(200);
      expect(res.body?.config?.has_webhook_key, "the stored key must be reported as present").toBe(true);
      // 0 is meaningful (suppression off) and must survive the round trip. It did
      // NOT before this fix: `Number(x || 60)` rewrote a stored 0 to 60, so the
      // "0 disables it" branch was unreachable and a device being commissioned
      // had every repeat swallowed after the first.
      expect(res.body?.config?.dedupe_seconds, "a stored 0 must read back as 0, not the 60 default").toBe(0);
    });

    await test.step("2. THE DEVICE POST — shared secret only, NO Authorization header", async () => {
      const res = await call(
        "post",
        "/api/cctv/alerts/ingest",
        {
          alert_type: "oil_spillage",
          camera_id: cameraRef,
          zone: "Bay 3",
          description: "E2E — spill detected near the lift",
          confidence: 0.91,
        },
        { device: true, key: DEVICE_KEY }
      );

      // This is the regression guard. A 401 here means the route is behind the
      // user-JWT gate again and is unreachable by any camera on site.
      expect(
        res.status,
        "the ingest webhook must be reachable with only X-CCTV-Key — a 401 means it is " +
        "behind the global JWT gate again (check PUBLIC_API_PATHS in server.ts)"
      ).toBe(200);
      expect(res.body?.status).toBe("created");
      expect(Number(res.body?.alert_id)).toBeGreaterThan(0);
    });

    await test.step("3. an unrecognised alert_type is stored as custom, never dropped", async () => {
      const res = await call(
        "post",
        "/api/cctv/alerts/ingest",
        { alert_type: "forklift_speeding", camera_id: cameraRef, description: "E2E — vendor-specific type" },
        { device: true, key: DEVICE_KEY }
      );
      expect(res.status).toBe(200);
      expect(res.body?.status).toBe("created");
    });

    await test.step("4. the operator sees both alerts in the feed", async () => {
      const res = await call("get", "/api/cctv/alerts?limit=200");
      expect(res.status).toBe(200);
      const mine = (res.body?.alerts || []).filter((a: any) => a.camera_ref === cameraRef);
      expect(mine.length, "both alerts must be readable back through the feed API").toBe(2);
      const spill = mine.find((a: any) => a.alert_type === "oil_spillage");
      expect(spill, "the known type must be preserved, not normalised to custom").toBeTruthy();
      // Severity came from the type's declared default, because the device sent none.
      expect(spill.severity).toBe("critical");
      const vendor = mine.find((a: any) => a.alert_type === "custom");
      expect(vendor, "the unknown type must be stored as custom").toBeTruthy();
      // A device that matches no registered camera still must not be dropped.
      expect(mine.every((a: any) => a.status === "OPEN")).toBe(true);
    });

    await test.step("5. a wrong device key is refused", async () => {
      const res = await call(
        "post",
        "/api/cctv/alerts/ingest",
        { alert_type: "custom", camera_id: cameraRef },
        { device: true, key: "definitely-not-the-key" }
      );
      expect(res.status, "a bad shared secret must not be accepted").toBe(401);
    });

    await test.step("6. whitelisting the device route did NOT open the read route", async () => {
      // The point of PUBLIC_API_PATHS is to whitelist ONE path, not the module.
      const res = await call("get", "/api/cctv/alerts", undefined, { device: true });
      expect(res.status, "reading alerts must still require a user JWT").toBe(401);
    });

    await test.step("7. the kill switch stops ingestion, and the key check still runs first", async () => {
      const off = await call("post", "/api/cctv/config", { enabled: false });
      expect(off.status).toBe(200);
      expect(off.body?.config?.enabled).toBe(false);

      const blocked = await call(
        "post",
        "/api/cctv/alerts/ingest",
        { alert_type: "intrusion", camera_id: cameraRef },
        { device: true, key: DEVICE_KEY }
      );
      expect(blocked.status, "ingestion must refuse while disabled").toBe(503);

      const restored = await call("post", "/api/cctv/config", { enabled: true, dedupe_seconds: 0 });
      expect(restored.body?.config?.enabled, "leave the sandbox usable for the next suite").toBe(true);
    });

    await test.step("8. duplicate suppression works once a window is set", async () => {
      // Same camera + same type inside the window collapses; a different type
      // from the same camera must still create its own row.
      const withWindow = await call("post", "/api/cctv/config", { dedupe_seconds: 300 });
      expect(withWindow.body?.config?.dedupe_seconds).toBe(300);

      const body = { alert_type: "loitering", camera_id: cameraRef, description: "E2E — dedupe probe" };
      const first = await call("post", "/api/cctv/alerts/ingest", body, { device: true, key: DEVICE_KEY });
      expect(first.body?.status).toBe("created");

      const second = await call("post", "/api/cctv/alerts/ingest", body, { device: true, key: DEVICE_KEY });
      expect(second.body?.status, "an identical repeat must collapse").toBe("duplicate");
      expect(second.body?.alert_id, "the duplicate must point at the original row").toBe(first.body?.alert_id);

      const otherType = await call(
        "post",
        "/api/cctv/alerts/ingest",
        { alert_type: "fire_smoke", camera_id: cameraRef },
        { device: true, key: DEVICE_KEY }
      );
      expect(otherType.body?.status, "the dedupe key is camera AND type, so a new type is a new alert").toBe("created");

      // Restore commissioning mode so a later run is not silently deduped.
      await call("post", "/api/cctv/config", { dedupe_seconds: 0 });
    });

    await test.step("9. acknowledging closes an alert out of the open feed", async () => {
      const open = await call("get", "/api/cctv/alerts?status=open&limit=200");
      const mine = (open.body?.alerts || []).find((a: any) => a.camera_ref === cameraRef);
      expect(mine, "expected at least one OPEN alert for this run's camera").toBeTruthy();

      const ack = await call("post", `/api/cctv/alerts/${mine.alert_id}/ack`);
      expect(ack.status).toBe(200);
      expect(ack.body?.success).toBe(true);

      const after = await call("get", "/api/cctv/alerts?limit=200");
      const same = (after.body?.alerts || []).find((a: any) => a.alert_id === mine.alert_id);
      expect(same?.status).toBe("ACKNOWLEDGED");
      expect(same?.acknowledged_by, "the acknowledger must be recorded").toBeTruthy();
    });
  });
});
