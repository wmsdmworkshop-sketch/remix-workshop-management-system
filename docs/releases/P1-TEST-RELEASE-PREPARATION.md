# P1 — Test Release Preparation

**TEST release. Not a production release, and not approval for real financial
operations.**

**No production access, no deployment, no cloud command and no test execution
was performed to produce this document.**

Owner decisions applied: **D-R1** (v1.1.0-rc.2 / build 125) · **D-R2** (minimal
new CHANGELOG) · **D-R3** (test-data designation, bounded).

---

## 1. Final source commit and tree status

**Two distinct commits. They must not be conflated.**

| Item | Commit | Meaning |
|---|---|---|
| **Tested source** | **`b21754c`** | The exact tree the P1 acceptance evidence was measured against: 38 component tests, typecheck 9, build, 166/9 node suite. **All recorded results describe THIS commit and no other.** |
| **Build source for a future build** | **the commit at build time** | Whatever `HEAD` resolves to when a build is actually run. It is **not** `b21754c` — `b91c1dd` (release metadata) already sits on top, and further commits may follow |

| Item | Value |
|---|---|
| Branch | `release/v1.1.0` |
| Tree at `b21754c` | **Clean** — no tracked modifications, 0 untracked |
| P1 code head | `7336ce2` |
| P1 baseline | `32d270c` |

**Consequence for `version.json`:** its `buildSourceCommit` currently reads
`b21754c`, which is accurate for the tested source. **If a build is made from a
later commit, that field must be updated to the actual build commit before
building** — otherwise the artifact will misreport its own provenance.

**Consequence for re-verification:** if the build commit differs from
`b21754c`, the acceptance evidence does not automatically carry over. The
checklist's re-measurement steps exist for exactly that reason.

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

### Deployment — isolated test service *(requires separate approval)*

**Overriding the service name alone is INSUFFICIENT.** A test service that
inherits production's database or secrets is a production deployment wearing a
different name. All four must be isolated:

- [ ] **Service name** — not `dwip-enterprise`. `cloudbuild.yaml:30` hard-codes
      `_SERVICE: dwip-enterprise`, so `_SERVICE` **must** be overridden
- [ ] **Database** — the test service must point at an isolated schema, **never**
      `35.200.150.167` / `railway`. Its Cloud SQL connection and `DB_*` values
      must be set explicitly for the test service, not inherited
- [ ] **Secrets / environment** — a separate set. Production credentials must not
      be mounted. External-integration keys should be **absent**, so integrations
      fail closed rather than calling live endpoints
- [ ] **Build substitutions** — `_SERVICE`, and `_TAG` set to the **actual build
      commit** (see §1: not necessarily `b21754c`)

```
gcloud builds submit --config deployment/cloudbuild.yaml   --substitutions=_SERVICE=<ISOLATED-TEST-SERVICE>,_TAG=$(git rev-parse --short HEAD)
```

- [ ] Record the new revision name

### Verify

- [ ] New revision Ready and serving
- [ ] `/api/health` returns `{"status":"UP"}`
- [ ] **Confirm the running service is connected to the isolated schema, not
      `railway`**, before any other check
- [ ] Job Card screen: absent facts read "Not recorded"; no confidence badge
      without a real value; money fields open empty
- [ ] T-W6-1 (§4) executed and passing

### Rollback — isolated test service

- [ ] Delete or redirect the test revision, or shift traffic to the previous
      **test** revision

**Production rollback inspection is NOT a prerequisite for an isolated test
deployment.** The earlier requirement to re-confirm `dwip-enterprise`'s serving
revision has been **removed**: a deployment that never touches the production
service cannot require a production rollback target, and inspecting one would be
unnecessary production access.

> A traffic rollback reverts **code only**. It does not reverse database writes
> made while the revision was live — including anything W-6 wrote at startup.
> Within an isolated test environment those writes land on disposable test data
> (D-R3). **This reasoning does not extend to production.**

---

## 4. T-W6-1 — restart safety: CAN it run locally?

> **W-6 is not assumed safe because its code is unchanged.** Unchanged code with
> unobserved behaviour is still undemonstrated.

### Isolation verdict: **YES — it can run entirely against the existing local `wms_test`**

**The unit-test database guard was NOT relied on.** That caution was correct:
`server.ts` contains **zero** references to `destructive_test_guard`
(`grep -c` → 0). The guard runs in vitest setup only and does not protect a
started application. Isolation was therefore established from `server.ts`'s own
boot path:

| Risk | Finding | Evidence |
|---|---|---|
| **Which database does a started `server.ts` use?** | `NODE_ENV=test` routes it to `.env.test` with `override: true` — `127.0.0.1:3307`, schema `wms_test`. Otherwise it loads `.env`, which is **production** | `server.ts:5-9` |
| **Startup revenue recomputation (W-6)** | Runs, unconditionally — which is the point of the test. It writes to the **connected** DB, i.e. `wms_test` | `server.ts:513` |
| **Other boot schedulers** | Two `setInterval` timers (SA-assignment sweep `:11864`; ETD escalation `:15147`). Both write only to the connected DB | `server.ts:11864`, `:15147` |
| **External integrations** | `.env.test` contains **no** external credentials (`GEMINI_API_KEY`, Azure, WhatsApp, DeepSeek, GCS, TMSA, Siebel — 0 matches). Integrations fail closed rather than calling live endpoints | `.env.test` |
| **Schema availability** | `wms_test` is currently **empty**, but boot self-provisions: `server.ts:509 → syncLoad() → ensureTablesExist()` creates `job_revenues`, `job_revenue_split_details`, `job_cards`, `job_technician_maps` | `server.ts:509`, `sync.ts:1611`, `:340`, `:576-598` |
| **Production reachability** | None, provided `NODE_ENV=test` is set. **This is the single point of failure** — see the safeguard below |

**The one real hazard:** if `NODE_ENV=test` is missing or misspelled,
`server.ts:8` loads `.env` and the application boots **against production**, and
W-6 would then rewrite production revenue rows at startup.

**Mandatory safeguard — to be run in the same shell immediately before start:**

```
node -e "require('dotenv').config({path:'.env.test'});if(process.env.DB_DATABASE!=='wms_test'||process.env.DB_HOST!=='127.0.0.1'){console.error('REFUSED');process.exit(1)};console.log('OK', process.env.DB_HOST, process.env.DB_DATABASE)"
```

Abort if it prints anything but `OK 127.0.0.1 wms_test`.

### Exact bounded execution scope — FOR APPROVAL

Nothing below has been run.

| # | Action | Bound |
|---|---|---|
| 1 | Run the safeguard above | Read-only |
| 2 | `NODE_ENV=test node dist/server.cjs` on **localhost only** | No public bind, no cloud |
| 3 | Boot provisions `wms_test` via `ensureTablesExist()` | Creates tables in `wms_test` **only** |
| 4 | Seed synthetic fixtures: one job card, one technician map, one employee | `wms_test` only; **no production data copied** |
| 5 | `POST /api/job-cards/:id/revenue` against **localhost** to create an allocation through the application path | Writes `job_revenues`, `job_revenue_split_details` in `wms_test` |
| 6 | Insert a second allocation with `revenue_id` **above** W-6's counter range | `wms_test` only |
| 7 | Record all rows by business identity | Read-only |
| 8 | Stop and restart the process once, so W-6 runs again | Local process only |
| 9 | Re-read and compare | Read-only |
| 10 | Stop the process | — |

**Tables written:** `job_revenues`, `job_revenue_split_details`, plus whatever
`ensureTablesExist()` creates in `wms_test`. **Nothing else.**
**Excluded:** production, any production data copy, `revenue_split_log`, any
cloud command, any deployment.
**Duration:** two short local runs.

### Pass criteria — compared by business identity, not row count

- Every allocation created in step 5 still has the same
  **`(job_id, employee_id, tech_role)`** and the same **`split_amount`**.
- The high-id allocation from step 6 is still correctly represented, **or**
  demonstrably superseded. If it remains in the table but has vanished from the
  application's view, **the test FAILS**.
- No row's `job_id` or `employee_id` differs from what was written.

**On failure — two permitted outcomes, neither assumed:** obtain approval for a
minimal protective change (gating W-6 behind a default-off flag, or keying its
upsert on business identity rather than a regenerated surrogate id), **or**
withhold operational go-live pending DEC-1.

**T-W6-1 gates operational go-live, not this test release.**

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

---

# 5. T-W6-1 execution attempt — **STOPPED, NOT EXECUTED**

**Source commit at attempt: `8866a4d4fceb780293429671c5747f785db23288`**

Execution was approved subject to mandatory isolation controls. **Two of those
controls cannot be established in this environment**, so the test was not
started. Per instruction, the specific blockers are reported and nothing was
worked around.

**The application was never started. No fixture was seeded. No allocation was
created. `wms_test` contains no data from this attempt.**

## 5.1 Controls that WERE established

| Control | Status | Evidence |
|---|---|---|
| Restricted database account | **ESTABLISHED** | `wms_test_runner` created in the disposable local container. `SHOW GRANTS` → `USAGE ON *.*` + `ALL PRIVILEGES ON wms_test.*` only. `SHOW DATABASES` returns `information_schema, performance_schema, wms_test`. `CREATE DATABASE` **denied** (ERROR 1044) — proven by a refused write, not by grant text alone |
| No production schema reachable | **ESTABLISHED** | The container holds only `wms_test` and MySQL's own system schemas. No `railway`, no production host |
| Effective DB configuration validated | **ESTABLISHED** (as a check) | `.env.test` → `127.0.0.1`, `3307`, `wms_test` |

## 5.2 BLOCKERS — controls that could NOT be established

### Blocker 1 — the listener cannot be bound to loopback

Requirement: *"Bind the application listener to loopback only."*

`server.ts:13140`:

```js
const server = app.listen(Number(process.env.PORT || 3001), "0.0.0.0", () => {
```

The host is the **literal `"0.0.0.0"`**. Only `PORT` is read from the
environment; the bind address is not configurable. Binding to loopback would
require editing `server.ts` — **an application code change, which this approval
explicitly excludes** ("Do not … change application code").

### Blocker 2 — outbound access cannot be prevented

Requirement: *"Prevent outbound access to production and external integrations.
Missing credentials alone are not sufficient isolation."*

That requirement is correct and I am not treating the absent keys in `.env.test`
as satisfying it. No enforcement mechanism is available here:

| Mechanism | Why unavailable |
|---|---|
| Host firewall rule | Requires elevation — `WindowsPrincipal.IsInRole(Administrator)` → **False** |
| `hosts` file override | Same elevation requirement |
| Container network policy | The application is not containerised for a local run |
| Proxy environment variables | The application honours none (no `HTTP_PROXY`/`NO_PROXY` handling found) |

The application would retain unrestricted network egress, including to the
production database host and external integration endpoints. Integrations would
fail on missing credentials — but **failing for lack of a key is not the same as
being unable to reach the endpoint**, which is precisely the distinction the
approval draws.

## 5.3 Why this matters beyond the letter of the requirement

`server.ts:5-9` selects its database purely from `NODE_ENV`:

```js
if (process.env.NODE_ENV === "test") { dotenv.config({ path: ".env.test", override: true }); }
else { dotenv.config({ override: true }); }   // -> .env, which is PRODUCTION
```

With unrestricted egress, a single missing or misspelled `NODE_ENV=test` would
boot the application against production — and W-6 would then rewrite production
revenue rows at startup. A printed check before launch does not prevent that,
because it validates a computed value rather than constraining the launched
process. The approval's own wording anticipates this: *"A printed 'OK' is not
sufficient unless the validated configuration is the configuration used by the
launched process."*

Network-level egress control is the missing safeguard. It is not available
without elevation.

## 5.4 Minimum prerequisites to proceed

Either:

1. **Elevated local access** to add a firewall rule or `hosts` override blocking
   the production DB host and external integration endpoints for the duration of
   the test; **or**
2. **An approved code change** (outside this approval) making the bind address
   configurable, plus an egress control; **or**
3. **A network-isolated runner** — a container or VM with no route to production
   — in which the application and its MySQL both run.

**Recommended: option 3.** It satisfies both blockers at once, needs no
elevation on this host and no application change, and is the only option that
constrains the launched process rather than checking it beforehand.

## 5.5 Effects of this attempt

| Item | State |
|---|---|
| Application started | **No** |
| Tables written | **None** |
| Fixtures seeded | **None** |
| `revenue_split_log` | **Not accessed** |
| Production | **Not accessed** |
| Application code | **Unchanged** |
| Cloud commands | **None** |
| Residual artefact | `wms_test_runner` account in the disposable local container — a grant only, no data |
