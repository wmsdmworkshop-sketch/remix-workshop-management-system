# Changelog

Created for the `v1.1.0-rc.2` **test** release, per owner decision D-R2.

**This file starts here deliberately.** It is not a reconstruction of project
history. Earlier releases are recorded in documents that were moved to a
gitignored quarantine in commit `8b753fe`; those were **not** restored, and this
file does not stand in for them.

---

## v1.1.0-rc.4 — workshop "active jobs" counted delivered history — **RELEASE**

**Build source:** working tree at `71c022c` plus these uncommitted changes.
**Release type:** PRODUCTION

Found by reading the live My Workspace dashboard against the Job Cards screen
beside it: the tile said **628 active jobs in the workshop**, while the list said
**64 in the workshop · 564 delivered (history)**. Both are computed from the same
628-card array. Only one of them was right.

### Fixed

- **"Active Jobs (Workshop)" reported 628 instead of 64** — it counted every
  delivered vehicle in history as live work. The endpoint excluded
  `['completed','invoiced','cancelled']`, three values `job_card_master.job_status`
  cannot hold (its ENUM is `Open, In Progress, Waiting Parts, Ready, Delivered,
  Carry Forward, Assigned, Unassigned, In Queue`), so the filter matched **0 of 628
  rows** and the count was the whole table. The same phantom values also sat in
  `MyWorkspace.tsx`. This is the failure mode `src/types.ts` already documents at
  length; the identical bug was fixed once before, and that pass left a Dashboard
  reading "0 open job cards" against 162 genuinely open.
  Fixed by adding **`hasLeftWorkshop()`** to `src/types.ts` as the single definition
  of "still on site" (`status === 'Delivered'` **or** a recorded `gate_out_time`),
  and using it in `server.ts` (active jobs, unassigned, breaches, WIP revenue, and
  the compliance denominator), `MyWorkspace.tsx` and `JobCardManager.tsx`. The last
  of those already carried this exact predicate inline — to the letter — which is
  precisely how the two screens came to disagree: two copies of one rule.
  `'Ready'` deliberately does **not** count as gone. The work is finished, but the
  vehicle is still holding a bay and is still the workshop's problem.
- **"SLA / ETD Breaches" could only ever read 0.** It tested
  `promised_delivery || promised_delivery_date || expected_delivery || due_date` —
  four names that are set by nothing anywhere in the codebase. The delivery promise
  lives in `etd` (627 of 628 production rows carry one). Now reads `etd`. On live
  data the honest figure is **63**, not 0. The same dead lookup existed in the
  personal breach count, in the derived SLA alert feed (`/api/my/alerts`), and in
  the per-card "Breach" pill.

### Behaviour changes that follow from the fix

- The personal "Assigned to me" pending count now excludes delivered cards.
  Previously every card a person could see counted as pending.
- Workshop-wide unassigned/breach/WIP-revenue figures are now computed over the 64
  live cards rather than all 628, so those tiles move as well.
- `JobCardManager`'s separate "billed / out of workshop" **toggle** predicate is a
  different concept — jobs still on site but administratively closed — and was
  deliberately left alone.

### Verified

- `src/tests/workshop-active-jobs.test.ts` (new, 7 cases) builds a 628-card fixture
  in the production shape and asserts 64 live / 564 history, that the old predicate
  reproduces the wrong 628, that a `Ready` card with no gate-out is **not** gone,
  and that the four phantom date fields match nothing.
- A read-only probe against production `job_card_master` confirmed 0 rows match the
  old predicate and 64 match the new one — the same 64 the job list displays.
- `tsc --noEmit`: no new errors. `EmployeeDirectory.tsx`,
  `engines/vehicle-passport/index.ts` and `lib/auth.ts` fail as they did before.

### Known, not fixed

Three more comparisons of the same phantom-value class were found and left alone —
they are outside the reported defect and each needs its own verification before it
is touched: `src/engines/overtime-rules.ts:189` (`['Completed','Invoiced',
'Cancelled']`, so overtime excludes nothing), `src/components/GateEntryManager.tsx:626`,
and `src/App.tsx:2201` / `:2263` (`['Closed','Cancelled']`, partly masked by a
correct `gate_out_time` test beside it).

---

## v1.1.0-rc.3 — gate-out evidence schema repair — **RELEASE**

**Build source:** working tree at `790d315` plus **uncommitted** changes (the
deploy pipeline builds the working tree, not the commit). Committing before the
next deploy would make this line accurate.
**Release type:** PRODUCTION

Found by driving a real job card from gate-in to gate-out end to end.

### Fixed

- **Gate-out was impossible** (production-critical). `tbl_evidence` was missing
  `job_id`, `gate_pass_id`, `image_url`, `capture_source` and `captured_by`, and
  `tbl_gate_out` was missing `image_url`. Both tables are declared in `server.ts`
  with `CREATE TABLE IF NOT EXISTS`, but already existed from a different lineage,
  so the declarations were silent no-ops — the same defect migration 028 fixed for
  `tbl_handoff_sla`. Effect: `POST /api/gate-out/evidence` answered 500, so no
  rear-plate capture could ever be registered, and `recordGateOut()` then refused
  with `REAR_EVIDENCE_REQUIRED` — instructing the operator to perform the one step
  that could not succeed. **No vehicle could be gated out in any environment.**
  Fixed by migration `030_evidence_gateout_columns.ts` (additive, nullable,
  `INFORMATION_SCHEMA`-guarded, idempotent).
- **`captureCrmInvoice` accepted a missing invoice date.** `crm_invoice_date` is
  NOT NULL with no default and was bound with no fallback, so omitting it surfaced
  as a raw mysql2 `Bind parameters must not contain undefined` inside a 500,
  naming neither the field nor the caller. Now rejected as
  `BILLING_INVOICE_DATE_REQUIRED`.
- **A billing readiness gate could block every job at once.** The pending-parts
  count compared a varchar job-number column against a bound value; a numeric bind
  makes MySQL compare numerically, coercing every non-numeric stored value to 0 and
  matching the whole table — so the gate reported a table-wide count as pending
  parts work and blocked billing for every job. Now cast to `CHAR` with an explicit
  collation.
- **`SELECT *` on `employees` removed** from `EmployeeRepository.findAll`. One
  `profile_photo` LONGTEXT row carried 601,600 of the 607,493 bytes returned; the
  other 43 columns total under 6KB. It is an optional field with no reader. The
  oversized transfer could exceed the query deadline mid-flight and wedge a pool
  connection, exhausting the pool (297ms → 43ms).
- **`fetchAllData` no longer blanks the console when one endpoint stalls.** All
  nine requests ran in one bare `Promise.all`, so a single slow endpoint left it
  pending forever and the Job Cards screen read "0 in the workshop" while
  `/api/job-cards` was returning 200 with all 627 cards. Each request now has its
  own deadline and cannot reject.
- **`DB_CONNECT_TIMEOUT` is configurable** (default 15000, was a hardcoded 2000).
  Cloud SQL over its public IP regularly needs longer than 2s to accept a
  connection — a *successful* probe was observed at 3330ms — so connects aborted,
  the pool tripped OFFLINE and auth returned 401s.

### Added

- `src/tests/gate_in_to_gate_out.e2e.spec.ts` — drives one vehicle from gate-in to
  gate-out as a single super user, asserting persisted state at every stage.
- `test-infra/seed_test_superuser.ts` — seeds the one super user the workflow
  suites authenticate as (the sandbox had `sbx_*` accounts in the database but in
  no file in the repository).

### Verified

Full journey against the isolated `wms_test` schema: gate-in → allocation → SA
estimate → floor QC handoff → QC acknowledge → QC PASS → SA acknowledge →
`PRE_INVOICE_READY` → billing chain → `BILLING_COMPLETED` → payment → gate pass →
rear-plate evidence → gate-out. Persisted end state read back from the database:
`job_card_master.live_status = 'COMPLETED'`, `tbl_pre_invoice.status =
'BILLING_COMPLETED'`, `tbl_gate_out.verification_result = 'VERIFIED'`,
`tbl_evidence.lifecycle_status = 'VERIFIED'`.

### Known, not fixed

- `wms_test.role_permissions` lacks `can_comment`, which the application expects.
  The sandbox's role-permission seeding therefore silently does nothing. Verified
  against the test schema only; **unconfirmed against production.**
- `RetryExecutor` still abandons in-flight queries on timeout without cancelling
  them, so the pool-connection leak mechanism remains — only its main trigger was
  removed. A durable fix requires the timeout to destroy the connection.

---

## v1.1.0-rc.2 — P1 Job Card truthfulness — **TEST RELEASE**

**Build source commit:** `b21754c96df95b048bef400720ef504ef7196c86`
**Build number:** 125 · **Release type:** TEST · **Not deployed.**

Presentation-only packet. No API, schema, permission or workflow change.

### Fixed

- **Invented vehicle facts removed** (D-1). Warranty terms, field service
  bulletin numbers and recall campaigns were selected by whether the vehicle
  model name contained "ev"; fabricated people and a bay appeared as
  recommendations. Absent facts now render "Not recorded".
- **AI confidence and explanation no longer fabricated** (D-2). The confidence
  figure was a string literal; the explanation rendered even when no analysis had
  run. Both now appear only when the response carries them.
- **Money fields no longer pre-filled** (D-3). Seeded amounts removed. Fields
  open empty, a blank field is refused rather than submitted as zero, and an
  untouched field cannot overwrite a stored amount. An explicit `0` remains valid
  and distinct from blank.
- **Mislabelled split total withheld** (D-4). The row displayed the labour
  invoice amount rather than a sum, and threw on a null value. Withheld rather
  than relabelled — its financial meaning is unresolved pending DEC-1.
- **Outcome messages follow the actual result** (D-5). Success is reported only
  on a confirmed successful outcome. A returned failure, a rejected call or an
  unconfirmed result reports "Could not confirm … Refresh the job details before
  retrying." — deliberately not "nothing was saved", since a thrown call does not
  establish whether the write reached the server. Raw exception text is never
  shown.
- **A failed load is distinguishable from an empty workshop** (D-6). Distinct
  loading, empty, filtered-empty and error states with a retry. A failed
  complaint-history fetch no longer asserts "The current complaint is Version 1".
- **Uncomputable values render as an em dash** (D-7). Elapsed time no longer
  shows the literal "Active"; waiting days no longer shows a fabricated zero. A
  genuine same-day job still shows "0 days".

### Added

- Component acceptance harness (`npm run test:components`) — dev dependencies
  only; no runtime dependency added.

### Known limitations

- Typecheck baseline: 9 pre-existing errors, none in a changed file.
- Unit suite: 166 passed / 9 failed — the 9 are pre-existing missing-fixture
  errors. **Not a clean pass.**
- No verification against a running application.
- Deploying this artifact starts the boot-time revenue recomputation (W-6),
  which is unchanged by this packet and **not demonstrated restart-safe**. See
  `docs/releases/P1-RELEASE-DECISION-RECORD.md`.
