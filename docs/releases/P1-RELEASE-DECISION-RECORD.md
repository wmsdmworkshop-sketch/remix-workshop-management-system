# P1 — Release Decision Record

**Prepared from existing source and already-collected evidence. No cloud
commands, production access, application startup or tests were run to produce
this document. No release metadata has been edited.**

**P1 acceptance remains CLOSED. Deployment is NOT approved.**

---

## 1. Release source and working-tree status

| Item | Value |
|---|---|
| **Release source commit** | **`b21754c96df95b048bef400720ef504ef7196c86`** (short `b21754c`) |
| Branch | `release/v1.1.0` |
| Tracked modifications | **None** |
| Untracked files | **0** |
| Tree state | **Clean** |
| P1 code head | `7336ce2` |
| P1 baseline | `32d270c` |

`b21754c` is the release source: it is `7336ce2` (the last P1 code change) plus
the release record commit. The four P1 commits are `ee5d4db`, `4c49df0`,
`ad3cfa3`, `7336ce2`.

---

## 2. Proposed `version.json` — PROPOSED ONLY, NOT APPLIED

Current file (stale — predates P1 by ~2 weeks and identifies no commit):

```json
{
  "version": "v1.1.0-rc.1",
  "release": "DWIP-v2.0.0-GA",
  "tag": "v1.1.13-ap05tb4993-synced",
  "buildTime": "2026-08-30T12:34:00.000+05:30",
  "buildNumber": "124",
  "commit": "HEAD",
  "updatedAt": "2026-08-30T07:04:00.000Z"
}
```

Proposed values, per AGENTS.md §2 ("Update `version.json` and record the release
tag/commit"):

| Field | Proposed | Rationale |
|---|---|---|
| `version` | `v1.1.0-rc.2` | P1 is a change on top of `rc.1`; no version currently distinguishes them |
| `release` | `DWIP-v2.0.0-GA` | unchanged — P1 does not alter the release line |
| `tag` | `v1.1.0-rc.2-p1-truthfulness` | names the packet; **[OPEN]** the existing `tag` format (`v1.1.13-ap05tb4993-synced`) is undocumented, so this is a proposal, not a convention match |
| `buildTime` | set at build, ISO-8601 with offset | must be the actual build moment, not a copied value |
| `buildNumber` | `125` | successor to 124 |
| **`commit`** | **`b21754c96df95b048bef400720ef504ef7196c86`** | **the literal `"HEAD"` identifies nothing once the branch moves; the full SHA is immutable and resolvable** |
| `environment` | `production` | unchanged |
| `updatedAt` | set at build | — |

**`commit` must be the full 40-character SHA, not `"HEAD"` and not the short
form** — a short SHA can collide as history grows.

**[OPEN] D-R1:** confirm the `version`/`tag` naming, since the existing values
follow no documented scheme.

---

## 3. Proposed release-note location

**Proposed:** `docs/releases/P1-JOB-CARD-TRUTHFULNESS.md` (already committed at
`b21754c`), with this record alongside it.

**This is a proposal, and it is NOT automatically compliant.** AGENTS.md §2
requires changes logged in **`docs/CHANGELOG.md`**. That file does not exist:
the entire `docs/` tree was moved to a gitignored quarantine in commit
`8b753fe`, so the path AGENTS.md cites resolves to nothing.

I have **not** restored the quarantined tree — that is a governance decision
(previously logged as D-4), not a release action, and restoring 469 untracked
documents as a side effect of shipping P1 would be the wrong way to make it.

Three options, none selected:

| Option | Consequence |
|---|---|
| **(a)** Accept `docs/releases/` as the location and amend AGENTS.md §2 | Documentation and practice agree; requires an AGENTS.md edit |
| **(b)** Create `docs/CHANGELOG.md` fresh and log P1 there | Matches the letter of AGENTS.md; creates a changelog with no history |
| **(c)** Restore the quarantined tree first | Largest scope; a governance decision in its own right |

**[OPEN] D-R2:** choose the release-note location.

---

## 4. Rollback revision — REPORTED, REQUIRES CONFIRMATION AT DEPLOY TIME

**Reported rollback target: `dwip-enterprise-00200-sh4`.**

This was read from `gcloud run services describe` **earlier in this session**,
under the access approved at that time. It is **evidence already collected, not
a fresh observation** — no cloud command was run for this record.

> **It must be re-confirmed under separately approved production access at the
> moment of deployment.** The serving revision can change between now and then,
> and rolling back to a stale target would be worse than not rolling back.

The example revision in `deployment/DEPLOY_DWIP_ENTERPRISE.md`
(`dwip-enterprise-00056-9tj`) is **stale and must not be used**.

Documented command, for reference only:

```
gcloud run services update-traffic dwip-enterprise --region asia-south1 \
  --project giga-course-dp497 \
  --to-revisions <CONFIRMED-REVISION>=100
```

---

## 5. Traffic rollback does not undo data changes

> **WARNING.** A Cloud Run traffic shift reverts only the **code** serving
> requests. It does **not** reverse any database write made while the new
> revision was live.

For this deploy specifically, that matters because of §6: the new revision's
startup performs a **write** (W-6). Shifting traffic back would leave any rows it
rewrote in their rewritten state. **Code rollback is not data rollback, and no
data-rollback procedure is proposed here.**

---

## 6. Does the deployment path start W-6? — **YES**

Verified by source inspection only:

| Evidence | Finding |
|---|---|
| `deployment/Dockerfile:89` | `CMD ["node", "dist/server.cjs"]` — the container runs the bundled `server.ts` |
| `server.ts:513` | `setImmediate(async () => { … })` registered unconditionally during boot |
| `server.ts:511-512` | The only comment explains **timing**, not authority: "moved out of boot critical path to eliminate cold-start delays" |
| `dist/server.cjs` | Contains the task's log line — **it is in the artifact that would be deployed** |
| Guard | **None.** No environment variable, feature flag, or lock |

**So any deploy of this artifact starts W-6 on every container start**, and with
`--max-instances=3` (per `deployment/CLOUD_RUN_CONFIGURATION.md:21-23`) it may
run on more than one instance.

**P1 changed none of this.** W-6 predates P1 and is untouched by it. The risk is
inherent to deploying this codebase at all, not introduced by this packet — but
a release decision should record it rather than inherit it silently.

### Owner decision required

**[OPEN] D-R3 — startup-write risk.** Deploying runs an unattended process that
rewrites revenue records at boot. Options, none selected:

| Option | Consequence |
|---|---|
| **(a)** Deploy as-is | Accepts the startup write. Consistent with every prior deploy of this service; nothing new is introduced |
| **(b)** Gate W-6 behind a flag, default off, before deploying | Removes the startup write from this deploy. **A code change in P5 territory — outside P1's approved scope**, and would require its own approval |
| **(c)** Defer the P1 deploy until DEC-1 (revenue record classification) is decided | Safest; delays a presentation-only fix that removes invented data now visible to staff |

**My reading, not a decision:** the risk is unchanged from the current running
revision, so (a) does not make anything worse than today. But it should be an
explicit choice, because §5 means a rollback would not undo whatever W-6 writes.

---

## 7. Release limitations

Carried from the acceptance record; none resolved.

| # | Limitation | Detail |
|---|---|---|
| **L-1** | **Typecheck baseline: 9 errors** | 6 `src/engines/vehicle-passport/index.ts`, 2 `src/components/EmployeeDirectory.tsx`, 1 `src/lib/auth.ts`. Pre-existing, unchanged by P1, **none in a P1 file**. Not repaired — out of scope |
| **L-2** | **Unit-test baseline: 9 failures** | All `Table 'wms_test.job_card_master' doesn't exist` — the suite provisions no schema fixtures. Pre-existing and unchanged (166 passed / 9 failed before and after P1). **That suite is not a clean pass** |
| **L-3** | **No running-app UI verification** | P1 is verified by 38 component tests, typecheck, build and bundle inspection. The application was never started; no screen was exercised in a browser, and no deployed build was checked |
| **L-4** | **W-6 behaviour unobserved** | §6 is a source-derived expectation. Whether it rewrites or diverges in practice is I-12, which requires a separately approved isolated environment |

---

## Approvals required to release

1. **D-R1** — confirm the proposed `version.json` values, then authorise applying them.
2. **D-R2** — choose the release-note location (amend AGENTS.md, create `docs/CHANGELOG.md`, or restore the quarantined tree).
3. **D-R3** — accept, mitigate, or defer the W-6 startup-write risk (§6).
4. **Production access at deploy time** — to re-confirm the rollback revision (§4).
5. **Deployment approval itself** — not granted by P1 acceptance.

**Nothing above has been executed. No metadata edited. P1 acceptance not
reopened. The revenue audit is not expanded beyond the §6 source check needed to
answer the question asked.**
