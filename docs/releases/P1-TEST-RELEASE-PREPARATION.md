# P1 — Test Release Preparation

**TEST release. Not a production release, and not approval for real financial
operations.**

**No production access, no deployment, no cloud command and no test execution
was performed to produce this document.**

Owner decisions applied: **D-R1** (v1.1.0-rc.2 / build 125) · **D-R2** (minimal
new CHANGELOG) · **D-R3** (test-data designation, bounded).

---

## 1. Final source commit and tree status

| Item | Value |
|---|---|
| **Build-source commit** | **`b21754c96df95b048bef400720ef504ef7196c86`** |
| Branch | `release/v1.1.0` |
| Tree at that commit | **Clean** — no tracked modifications, 0 untracked |
| P1 code head | `7336ce2` |
| P1 baseline | `32d270c` |

### How the self-reference was avoided

`version.json` cannot contain the SHA of the commit that carries it. Resolved by
recording the **build-source commit** — the tree state the artifact is built
from — in a dedicated `buildSourceCommit` field, set to `b21754c`, the last
commit before the metadata change.

**Verified before choosing this:** nothing reads `version.json` at build or
runtime (no reference in `server.ts`, `src/`, `deployment/`), so it is a release
record, not an input. The metadata commit therefore changes no shipped
behaviour, and `b21754c` remains an accurate description of what is built.

### Timestamps

`buildTime` / `updatedAt` are set to the **commit time of `buildSourceCommit`**
(`2026-09-12T10:53:37+05:30`).

**Why not a "stamped at build" placeholder:** no build step touches this file —
verified across `cloudbuild.yaml`, `Dockerfile` and `package.json`. A
`TO_BE_STAMPED_AT_BUILD` literal would therefore **ship as that literal**, which
is worse than a real but conservative timestamp. A commit time is verifiable and
tied to the source. `buildTimeNote` records this so it is not mistaken for a
build stamp.

### Applied `version.json`

```json
{
  "version": "v1.1.0-rc.2",
  "tag": "v1.1.0-rc.2-p1-truthfulness",
  "buildNumber": "125",
  "environment": "test",
  "releaseType": "TEST",
  "commit": "b21754c96df95b048bef400720ef504ef7196c86",
  "buildSourceCommit": "b21754c96df95b048bef400720ef504ef7196c86",
  "buildTime": "2026-09-12T10:53:37+05:30"
}
```

`environment` changed `production` → **`test`**, and `releaseType: "TEST"` added,
so the artifact is not mistaken for a production build.

---

## 2. Test-data designation — exact scope

**D-R3 designates records within the explicitly designated application test
scope as disposable test data. It is NOT approval to delete data, and NOT
approval to include historical AppSheet tables.**

### Environment — one only

| Property | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `3307` |
| Schema | **`wms_test`** |
| Source of truth | `.env.test` |
| Enforcement | `src/tests/destructive_test_guard.ts` — refuses `railway`, refuses any schema ≠ `wms_test`, verified by a live `SELECT DATABASE()` |

**Explicitly excluded:** `35.200.150.167` / schema `railway` (production), and
any copy of production data. No production data is to be loaded into
`wms_test`; fixtures are synthetic.

### Tables IN scope — two

| Table | Basis |
|---|---|
| `job_revenues` | Written by the application via `upsertRows("job_revenues", …)` — `sync.ts:2149` |
| `job_revenue_split_details` | Written via `upsertRows(…, "detail_id")` — `sync.ts:2150` |

These are the only revenue tables the application writes.

### Tables explicitly OUT of scope

| Table | Reason |
|---|---|
| **`revenue_split_log`** | **Historical AppSheet-era table. EXCLUDED by D-R3.** The application only ever **reads** it (`server.ts:5519`, `sync.ts:1755`); no `INSERT` exists in this repository. Its writer, if any, is external and unidentified |
| `tbl_credit_requests`, `tbl_payments`, `tbl_invoice`, `tbl_gate_pass` | Financial/release records outside the revenue-allocation scope |
| Every table in schema `railway` | Production |

**No deletion is authorised by this designation.** It establishes only that rows
created *within* `wms_test` during testing need not be preserved.

---

## 3. Bounded test-release deployment and rollback checklist

**Each step requires its own approval at execution time. Nothing here is
authorised by this document.**

### Pre-deployment

- [ ] Confirm build-source commit is `b21754c` and the tree is clean
- [ ] Confirm `version.json` reads `v1.1.0-rc.2`, build 125, `environment: "test"`
- [ ] Re-measure `npx tsc --noEmit` → expect **9**, none in a changed file
- [ ] Re-measure `npm run build` → succeeds
- [ ] Re-measure `npm run test:components` → **38 passed, 0 failed, 0 unhandled**
- [ ] Re-measure `npm run test:unit` → 166/9, unchanged (**not** a clean pass)
- [ ] **Confirm the deployment target is a TEST service, not `dwip-enterprise`**

### Deployment *(requires separately approved access)*

- [ ] Target service name confirmed in writing — **`dwip-enterprise` is
      production and is NOT the target of a test release**
- [ ] `gcloud builds submit --config deployment/cloudbuild.yaml --substitutions=_TAG=b21754c`
      — **note:** `cloudbuild.yaml` hard-codes `_SERVICE: dwip-enterprise`
      (line 30). **A test deploy requires overriding that substitution**, or it
      will deploy to production
- [ ] Record the new revision name

### Verify

- [ ] New revision Ready and serving
- [ ] `/api/health` returns `{"status":"UP"}`
- [ ] Job Card screen: absent facts read "Not recorded"; no confidence badge
      without a real value; money fields open empty
- [ ] **Restart-safety test in §4 executed and passing**

### Rollback

- [ ] **Re-confirm the current serving revision immediately before deploying** —
      the previously reported `dwip-enterprise-00200-sh4` is evidence from an
      earlier session and **must not be trusted at deploy time**
- [ ] `gcloud run services update-traffic <service> --to-revisions <CONFIRMED>=100`

> **A traffic rollback reverts CODE ONLY.** It does not reverse any database
> write made while the new revision was live — including anything W-6 wrote at
> startup. **There is no data-rollback procedure**, and none is proposed here.

---

## 4. Restart-safety acceptance test — W-6 vs newly created allocations

**Specified only. Not executed.** Requires the isolated `wms_test` environment
and separate approval.

> **W-6 is not assumed safe because its code is unchanged.** Unchanged code with
> unchanged behaviour is still undemonstrated behaviour.

### T-W6-1 — an approved allocation survives a restart unaltered

**Given** — in `wms_test` only, synthetic fixtures:
1. A job card with at least one technician in `job_technician_maps`.
2. A revenue allocation created through the **application path** (`POST
   /api/job-cards/:id/revenue`), recording `revenue_id`, `detail_id`,
   `job_id`, `employee_id`, `tech_role`, `split_pct`, `split_amount`.
3. A second allocation whose `revenue_id` is **deliberately above** the range
   W-6 would generate (W-6 restarts its counters at 1 — `server.ts:571-572`).

**When** — the application is restarted so the boot task runs once.

**Then** — assert **by business identity, not row count**:
- For every allocation created in step 2, a row still exists with the **same
  `(job_id, employee_id, tech_role)`** and the **same `split_amount`**.
- The high-id allocation from step 3 is **either** still correctly represented
  **or** demonstrably superseded — and if it has vanished from the application's
  view while remaining in the table, **the test FAILS**.
- No row's `job_id` or `employee_id` differs from the value written in step 2.

**Pass criterion:** no approved allocation is altered or orphaned by the restart.

**On failure — two permitted outcomes, neither assumed:**
1. Obtain approval for a **minimal protective change** (for example, gating W-6
   behind a default-off flag, or keying its upsert on business identity rather
   than a regenerated surrogate id), **or**
2. Withhold operational go-live until DEC-1 (revenue record classification) is
   decided.

**This test gates operational go-live, not the test release.**

---

## Status

| Item | State |
|---|---|
| `version.json` | **Applied** (not committed at time of writing) |
| `docs/CHANGELOG.md` | **Created** — this release only; quarantined docs **not** restored |
| Deployment | **Not authorised, not performed** |
| Production access | **Not used** |
| T-W6-1 | **Specified, not executed** |
| P1 acceptance | **Closed, not reopened** |
| P2–P6 | **Unchanged** |
