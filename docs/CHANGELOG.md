# Changelog

Created for the `v1.1.0-rc.2` **test** release, per owner decision D-R2.

**This file starts here deliberately.** It is not a reconstruction of project
history. Earlier releases are recorded in documents that were moved to a
gitignored quarantine in commit `8b753fe`; those were **not** restored, and this
file does not stand in for them.

---

## v1.1.0-rc.6 — pending-action reminders in the Android app — **RELEASE**

**Build source:** working tree at `31ad600` plus these changes.
**Release type:** PRODUCTION (web) · **the native half additionally needs a new APK**

**Owner request (2026-09-14):** "in the android app send notification to the user where
his actions are pending, every 5 mins."

### What was built

- **`src/lib/action-reminders.ts`** — the policy, pure and unit-testable: what counts
  as a pending action, when a reminder may fire, and what it is allowed to say.
- **`src/lib/action-reminder-scheduler.ts`** — the effectful half: reads the user's own
  work, publishes one Android notification, and runs the 5-minute timer.
- Mounted once in `AppShell`; notification permission and channel are set up on first use.
- Android: `@capacitor/local-notifications@8.3.1` added, `POST_NOTIFICATIONS` and
  `VIBRATE` declared, plugin wired through `capacitor.build.gradle` and
  `capacitor.settings.gradle`.
- The user's own pending work is read from `/api/my/summary` (`mine.pending`,
  `mine.breaches`) and `/api/my/alerts` (the itemised alerts the server derives for
  that user). NOT from `/api/notifications`, which is workshop-wide and would tell
  every user about everyone's work.

### The three rules that stop it being muted

A naive "fire every 5 minutes" gets the app silenced inside a day, so:

1. **It never fires when nothing is pending.** A clock-driven nudge that claims work
   against an empty queue is a fabricated statement about someone's workload, and it
   destroys the signal for the times it matters. When the queue empties, any standing
   reminder is WITHDRAWN rather than left in the tray describing work already done.
2. **Every tick republishes ONE notification id**, so the tray shows the current
   reminder instead of ~96 near-identical copies across a working day.
3. **08:00–20:00 window.** A 03:00 reminder does not get actioned; it gets the app
   silenced. Overridable per device via `dwip_reminder_window`
   (`{"startHour":9,"endHour":18}`); a malformed value falls back to the default
   rather than opening the window to all hours.

Empty results, failed fetches and unreadable fields all resolve to "say nothing" —
never to 0, which would read as "nothing to do" and silently disable the reminder.

### DELIVERY LIMIT — the honest scope

**This cannot fire every 5 minutes while the app is closed.** It runs on a JS timer
inside the Capacitor WebView, so it fires while the app is running and stops when
Android suspends the WebView. Android's floor for periodic background work
(WorkManager) is **15 minutes**, enforced by the OS — no timer can beat it. True
background delivery needs one of:

- **FCM server push** — a Firebase project, `google-services.json`, a device-token
  table and `@capacitor/push-notifications`; or
- a **native foreground service**, which works but shows a permanent "DWIP is
  running" notification.

Neither is part of this change, and nothing here pretends otherwise: on the web, and
in any APK built before the plugin existed, `isActionReminderSupported()` is false and
the entire path is an honest no-op.

### The native half needs a rebuilt APK

The Android app is a remote-URL WebView shell (`capacitor.config.ts` → `server.url`),
so the JS ships with the web deploy — but the PLUGIN it calls only exists in an APK
built after this change. **Every APK distributed so far lacks it.**

`public/downloads/*.apk` were deliberately NOT overwritten: they are separately named
legacy artifacts (`dwip-driver`, `dwip-executive`, `dwip-customer`) and no build step
regenerates them. The new build is a discrete artifact for review.

R8 keep rules already covered the new plugin generically
(`-keep class com.capacitorjs.plugins.** { *; }`), which matters because Capacitor
loads plugins by reflection and a stripped plugin fails only at runtime.

### Verified

- `src/tests/action-reminders.test.ts` (new, 27 cases): the 5-minute interval and the
  fixed notification id; the window (inclusive start, exclusive end, midnight-wrapping
  night shift, zero-width = unrestricted); a malformed override falling back to the
  default instead of all hours; counts read from `mine.*` with a `counts.*` fallback;
  itemised alerts with severity mapping; junk input never throwing and never inventing
  a count; `buildReminderNotification` returning **null** for an empty queue (so it can
  never say "0 pending"); singular/plural wording; fingerprint stability; and
  `decideReminder` refusing outside the window even with real work, and refusing an
  empty queue during it.
- `npm run build:rc1` succeeds; `tsc --noEmit` adds no new errors; the suite's 7
  failures are unchanged from before this change (228 tests, up from 201).

---

## v1.1.0-rc.5 — gate pass requires settled payment — **RELEASE**

**Build source:** working tree at `f3aeee4` plus these changes.
**Release type:** PRODUCTION

**Business rule (owner, 2026-09-14):** at any stage, nobody other than `developer` or
`gm_service` may issue a gate-out pass unless payment is settled against the billing —
the final consolidated invoice amount.

### The hole this closes

`POST /api/gate-out/create-gate-pass` required only that SOME row existed in `tbl_payments`
with status `COMPLETED`. **The amount was never compared to the invoice.** A ₹1 token
payment therefore released a ₹66,655 vehicle, and the balance left the yard with it. The pass
recorded `release_basis = 'PAID'` in that case, so the audit trail asserted a settled payment
that had never happened.

### Fixed

- **New `src/core/workshop/release-settlement.ts`** — the rule in the shared layer, with one
  place that answers "may this vehicle be released?":
  - `developer` and `gm_service` may release without settlement, and that override is
    audited as `GATE_PASS_SETTLEMENT_OVERRIDE` rather than logged as an ordinary pass.
  - Everyone else needs `collected >= final consolidated invoice amount` (₹0.01 tolerance).
  - A refusal returns **402 Payment Required** carrying `invoiceAmount`, `paidAmount`,
    `shortfall` and `creditApproved`, so the cashier sees the exact balance rather than a
    bare string.
  - **`admin` is NOT exempt.** The rule names two roles, and `admin` is system
    administration, not commercial authority — so an admin must also collect first. This is
    a tightening: any holder of `GATE_PASS_ISSUE_ROLES` (which includes `admin`, `cashier`,
    `service_manager`, `workshop_manager`) previously released on a part payment.
- **Two invoice lineages, because taking one would have been wrong.** The live billing record
  (`tbl_pre_invoice_version.grand_total` at `current_version`, which `billing-engine.ts`
  maintains) is preferred; the DMS consolidated invoice (`invoices.final_consolidated_amt`,
  joined on `order_no = job_card_no`) is the fallback. This matters because **`tbl_pre_invoice`
  is empty in production** (its 81 fixture rows were removed on 2026-09-14) while `invoices`
  holds 9,538 rows — a billing-record-only rule would have left every imported vehicle
  permanently unreleasable.
- **Duplicate `order_no` rows take the MAXIMUM amount**, never the first match. Production has
  up to 4 invoices sharing one `order_no` (re-catalogued under C/D/I prefixes). On the rows
  inspected every copy carried an identical amount, but taking the maximum means a partial or
  superseded document can never understate what is owed.
- **An unreadable amount is never treated as settled.** `parseAmount` returns null for
  `null` / `""` / `"N/A"` / `"TBD"` / `"12abc"` instead of coercing to 0 — a 0 invoice would
  make every payment look settled and release the vehicle for free.
- **`record-payment` now allows top-ups.** It previously refused any second payment
  (`PAYMENT_ALREADY_RECORDED`), which would have deadlocked every part-paid job the moment the
  full-settlement rule landed: the new gate requires the whole invoice, and there was no way
  left to collect the balance. It now accepts further payments and guards the two real risks —
  `PAYMENT_ALREADY_SETTLED` and `PAYMENT_EXCEEDS_BALANCE`.
- **Cashier screen** (`CashierWorkspace.tsx`) now shows invoice / collected / balance, gates the
  button on the server's `may_issue`, and prefills the **outstanding balance** rather than the
  full invoice. It previously read `job.crm_invoice_amount` — a field no endpoint returns — and
  rendered the literal text `Net: ₹undefined`, while offering the pass whenever *any*
  `payment_mode` had been recorded.

### Not changed, deliberately

- **A GM-approved credit no longer lets a non-exempt role release.** The rule names only
  `developer` and `gm_service`, so the credit stays valid but is exercised BY that authority —
  `gm_service` or `developer` issues the pass. The refusal message says so explicitly. If the
  intent is for a cashier to release on a GM-approved credit, that is a one-line change in
  `evaluateReleaseSettlement`.
- The **Manual Gate Pass** workflow (`billing-engine.raiseManualGatePassRequest` /
  `gmApproveManualGatePass`) is already GM-gated at approval and does not mint a `tbl_gate_pass`
  row, so it needs no extra check.
- The dead `jc.status in ('invoiced','completed')` fallback went with the old block. Neither
  value is legal in `job_card_master.job_status`, so it had never fired.

### Current production effect

None of the 64 live jobs has an invoice — `tbl_pre_invoice` is empty and none matches an
`invoices` row — so all of them are refused with `GATE_PASS_NO_INVOICE`. That is the SAME
outcome as before this change, which also refused them ("no invoice raised for this job yet").
The settlement rule starts to bite as soon as real invoices exist.

### Verified

- `src/tests/release-settlement.test.ts` (new, 20 cases): a part payment is refused for
  cashier/admin/service_manager/workshop_manager; exact payment and overpayment are allowed;
  ₹0.01 tolerance honoured but a ₹1 shortfall refused; `developer` / `gm_service` /
  `"GM Service"` / `"gm-service"` all exempt; admin/cashier/managers NOT exempt; no invoice →
  `GATE_PASS_NO_INVOICE`; unreadable amount → `GATE_PASS_SOURCE_DOWN` and never settled; a
  zero-value invoice (warranty) releases; the billing record is preferred over the consolidated
  invoice; the consolidated fallback is used; duplicates resolve to the maximum; an unreadable
  billing table falls through to the consolidated invoice.
- The production join was **proven, not assumed**: `invoices.order_no` is `utf8mb4_unicode_ci`
  while `job_card_master.job_card_no` is `utf8mb4_0900_ai_ci`, and comparing them WITHOUT an
  explicit `COLLATE` raises `ER_CANT_AGGREGATE_2COLLATIONS`. That is a loud failure — the safe
  direction for a money check, since a silently empty match set would have read as "no invoice".
- All 9,538 `final_consolidated_amt` values are plain numerics (checked), so there is no
  silent-zero coercion.

---

## v1.1.0-rc.4 — workshop "active jobs" counted delivered history — **RELEASE**

**Build source:** commit `9bfe22b` (clean tree — the image tag and the commit now name the same revision).
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
- **Verified live in production** on revision `dwip-enterprise-00235-jxv`. The tile now
  reads **63** and the job list reads **"63 in the workshop · 565 delivered (history)"** —
  the two screens agree for the first time. "SLA / ETD Breaches" moved 0 → **63**,
  "Unassigned (No SA)" 15 → **2**, "Assigned to me" breaches 0 → **3**, and **My Alerts**
  went from empty to 3 real derived SLA alerts. All of those move together because they
  shared the one dead `etd` lookup and the one phantom status test.
  The live count is 63 rather than the 64 measured minutes earlier because a vehicle was
  gated out in between; 63 + 565 = 628 and `COUNT(DISTINCT job_card_id)` is also 628, so
  no card was lost.
- The `gate_out_time` half of the predicate is load-bearing, not decoration: two imported
  cards (`JC-DevAus-AA1-2627-001755` / `-002069`) carry `job_status='Assigned'` but a real
  gate-out stamp with `live_status='GATE_OUT'`. Judging purely on status would have counted
  two departed vehicles as live work.

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
