# Changelog

Created for the `v1.1.0-rc.2` **test** release, per owner decision D-R2.

**This file starts here deliberately.** It is not a reconstruction of project
history. Earlier releases are recorded in documents that were moved to a
gitignored quarantine in commit `8b753fe`; those were **not** restored, and this
file does not stand in for them.

---

## v1.1.0-rc.25 — The payroll rule was right, but nothing was feeding it — **RELEASE**

**Release type:** PRODUCTION

**Owner ruling, verbatim:** *"technicians are all mechanics but electricians are different."*

### The feature: two in-house verticals, 50/50 across them

`src/lib/revenue-split-engine.ts` now derives a binary vertical — `verticalOfRole()`
returns `MECHANICS` or `ELECTRICAL`. When **both** are on a job the labour splits **50/50
between the verticals**, and each vertical then subdivides internally by the existing
ladder. When the **total in-house headcount exceeds 4** the taper stops and each vertical
divides its own half equally.

A **single-vertical job — the common case — is bit-for-bit unchanged**, pinned by a
regression test. The vertical is deliberately *not* derived from `classifyRole()`, which
still returns four buckets and serves a different purpose.

The electrician test matches on `elec`, not `electrician`, on purpose: production
employee 21 is spelled **`Jr. elecrician`**, and the longer substring would have silently
paid them out of the wrong half.

**25 tests pass**, 11 of them new, including a money sweep asserting every mixed split
still sums to the exact labour amount.

### Why this is corroboration, not interpretation

The vertical split was not invented here — it was already in the database. The production
table `revenue_splits` held exactly these rules as configured reference data:

| code | label | tech | co_tech | **electrician** |
| --- | --- | --- | --- | --- |
| `T1` | 1 Tech | 100 | 0 | 0 |
| `T2` | 2 Techs (60-40) | **60** | **40** | 0 |
| `T1_E1` | 1 Tech + 1 Elec | **50** | 0 | **50** |

Both the 60/40 shipped in rc.24 and the 50/50 across verticals here match a matrix that was
**already in the database**. The engine reads none of it.

### The finding: the split engine has never produced a single production split

Measured, not inferred:

| | rows |
| --- | --- |
| `job_revenues` · `job_revenue_split_details` · `job_revenue_split` | **0 · 0 · 0** |
| `job_technician_maps` · `job_card_technician` | **1 · 0** |
| `technician_productivity` · `technician_kpi_daily` · `productivity_alerts` | **0 · 0 · 0** |
| `job_card_master` — of **671** rows, `tech_slot_1`…`tech_slot_5` populated | **0** |

**Not one job card in production has a technician assigned to it.** And `revenue_split_log`
holds 13 rows with real job cards, invoices and labour/spare amounts — but every derived
column reads `0.00` and `recorded_by` is NULL. The log was written; the split never was.

**This corrects an earlier claim** in this build line: that the runtime path uses
`job_technician_maps`, so splits *are* produced for new work and only the historical
backfill was thin. **That was wrong.** Nothing is produced.

**Consequence:** neither the 60/40 of rc.24 nor the vertical layer in this release changes
any existing row, because no such row exists. The risk was never retroactive — it is that
the feature is not wired end to end. The gap between *a correct rule* and *a technician
actually getting paid* is the pipeline from technician assignment through
`calculateRevenueAllocation` into `job_revenues`.

### Assumed and awaiting the owner — not verified

- **`Wheel Alignment` and `Mechanical Helper` both classify as `MECHANICS`.** The owner did
  not name them. Recorded in the tests as a decision to confirm.
- **3 mechanics + 1 electrician:** the ladder gives the lone electrician **50%** of the
  labour while each mechanic receives ~16.7%. That is the specification implemented
  exactly, not quietly softened — but it is a large swing, and if the intent was
  headcount-weighted verticals, it needs saying.

### Still not implementable: the vendor vertical

There is **no vendor cost column anywhere in the schema**, and
`job_technician_maps.employee_id` carries a `FOREIGN KEY` to `employees` — so a
non-employee vendor **cannot be recorded on a job at all**. Nothing was invented to paper
over this.

### Gates

- `npm run lint:fabrication` — **PASS**
- `tsc --noEmit` — unchanged; the same **9 pre-existing** errors, none in a file this
  release touches
- `vitest` revenue-split suite — **25 passed**

### Still open from rc.24, not fixed here

The served `/version.json` reports **build 127**, because it is copied from
`public/version.json` — a different file, with a different schema, that no step in the
release process updates.

---

## v1.1.0-rc.24 — Four things the UI was quietly lying about — **RELEASE**

**Release type:** PRODUCTION

**Asked for:** "clean the UI, make it more simple to use, reduce any extra items."

That is what the work started as. Auditing what was actually there turned up four
defects that were not untidiness. Each one is recorded below with the evidence that
established it, because in every case the code looked fine and the *behaviour* was wrong.

### 1. CCTV cameras could not deliver a single alert

`/api/cctv/alerts/ingest` was **not** in `PUBLIC_API_PATHS`. The global JWT gate is
registered *before* that route, so the route answered `401` before its own `X-CCTV-Key`
check ever executed. The endpoint existed, was correct, and was unreachable.

Now whitelisted. It still **fails closed**: `503` with no key, `401` on a wrong key,
`503` when the integration is disabled. Proven by `cctv_ingest.e2e.spec.ts`, which posts
with only `X-CCTV-Key` and no `Authorization` header and asserts `200`.

The same feature had a second, quieter bug: `dedupeSecondsOrDefault` used
`Number(raw || 60)`. Because `0` is falsy, a configured `0` became `60`, making the
documented "0 disables dedupe" commissioning branch **unreachable**. Rather than reason
about it, this was found by writing the test first.

### 2. Chain of custody read "Not recorded" on practically every job card

`tbl_handoff_sla.entity_id` is **polymorphic across four different things**:

| Stage | `entity_id` holds |
| --- | --- |
| `GATE_TO_RECEPTION` | `gateEntryId` |
| `RECEPTION_TO_MANAGER`, `SLA_MANAGER_TO_SA` | `intakeId` |
| later stages | job card number, or job card id |

The route searched only the last two forms, so roughly **591 of 626** production rows were
unreachable. The panel was not failing — it was faithfully reporting that it could not see
the history.

`src/core/workshop/custody-entity-keys.ts` now builds the whole search space: job card
number and numeric id, bridged through `tbl_sa_intake` to `gate_entry_id` and `intake_id`,
plus a VRN fallback that resolves **only when the registration maps to exactly one gate
entry**. Ambiguity resolves nothing, deliberately — guessing would attribute one vehicle's
handoffs to another.

### 3. And a false negative inside that same panel

`breached` and `escalated` initialised to `false`, and the UI rendered `false` as **"No"**.
So a card whose clock had almost certainly run out was shown as *not escalated* — an
assertion nobody had the data to make. They now initialise to `null` and render
"Not recorded", with an explicit `holder_known` flag.

### 4. Two technicians were paid 50/50; the owner's rule is 60/40

Corrected in `src/lib/revenue-split-engine.ts`. The roles are now labelled
`Lead Technician` / `Assistant Technician`.

**Read this before comparing pay across the change:** rows already persisted in
`job_revenues` / `job_revenue_split_details` still say 50/50 and are **never rewritten**.
The backfill treats existing revenue as authoritative, and rewriting money is an owner
decision, not a cleanup. Only newly calculated splits use 60/40, so any report spanning
this date will show a mix.

Also worth knowing: the *larger* share follows `getSeniorityScore()` — salary, grade and
role keywords — not the technician-vs-assistant role. A low-paid lead paired with a
better-paid assistant is currently credited backwards. That is pinned by a named
`KNOWN LIMITATION` test so the eventual fix is deliberate rather than accidental.

### Removed: the login page was advertising four endpoints that do not exist

`EnterpriseGateway` rendered a Developer Console — three AI Doctor cards and a
"Developer Login Unlock" — wired to:

```
POST /api/system/ai-doctor/login
POST /api/system/ai-doctor/ui
POST /api/system/ai-doctor/deployment
POST /api/system/auth-recovery/unlock
```

None of these exists anywhere in the codebase; the only matches were the `fetch` calls
themselves. Because they were unwhitelisted, the `401` came back and the `catch` block
rendered it as a **diagnostic verdict** — `"Unlock action failed"`, `overallHealth:
CRITICAL`. A feature that was never built presented as one that had been checked and
failed. This is the third instance of this class pruned since 2026-09-06.

The console is gone, along with its `AI Login Doctor available for diagnostics` login
error, three `AppShell` sidebar buttons that had no `onClick` at all, and a duplicate
mobile bottom nav that sat at `z-40` underneath the `App.tsx` tab bar at `z-50`.

### Fixed: a notification linking to a tab that did not exist

`server.ts` raised a bell entry with `link: "cctv-safety"`. No such tab was registered, so
clicking it silently bounced to the role's first tab. This is the one place where the fix
is a genuine new feature rather than a repair: `CctvFloorSafety.tsx` (alert feed, cameras,
bay view, settings) now exists, registered for `developer`, `admin` and `gm_service`.

### Also on this branch: the Android toolchain was two majors behind

Committed separately as `chore(android)`. AGP `8.13.0 → 9.4.0`, Gradle `9.1.0 → 9.6.0`,
verified by a full `assembleStaffRelease`: **BUILD SUCCESSFUL, 6m36s, 188 tasks**, with R8
minification, resource shrinking and release signing all executing.

One flag is load-bearing, not cosmetic: `android.newDsl=false`. `@capacitor/camera` still
calls the legacy variant API (`libraryVariants` / `testVariants` / `unitTestVariants`),
which AGP 9 disables by default. Removing that flag breaks the build.

All ten `android.*` flags are deprecated and **scheduled for removal in AGP 10**, and the
build itself warns that deprecated Gradle features make it incompatible with Gradle 10.
This migration buys headroom; it does not finish the job.

**And the APK reinstall everyone assumes is needed is not.** `capacitor.config.ts` sets
`server.url: "https://devanand.aivaahan.com"` — the app is a **remote-URL WebView shell**.
Web deploys reach installed apps immediately; only a new *native plugin* requires a new
APK. Conversely, three orphaned files in `public/downloads/` still exist and cannot help:
`dwip-customer-v2.0.0.apk` and `dwip-driver-v1.2.0.apk` are **byte-identical** (one file
under two names, both `com.aivaahan.dwip` v1.1.0-rc.1), and `dwip-executive-v2.4.0.apk` is
the **retired** `management` flavor. Distribution is the Play listing for
`devanand.aivaahan.com`, which is what `PLAY_URL` points at.

### Gates

- `npm run lint:fabrication` — **PASS**, 891 files, 0 errors, 0 warnings
- `tsc --noEmit` — the same **9 pre-existing** errors, none in a file this release touches
- `vitest` — **65 passed** across the four suites added here

### Still open, deliberately not guessed at

The three-vertical rule — mechanics, electrical and outsourced, splitting labour 50-50
across verticals and then subdividing within each, with the vendor's cost deducted before
the split — **remains a specification only**. There is no vertical column anywhere in the
schema, and `job_technician_maps.employee_id` carries a foreign key to `employees`, so a
non-employee vendor cannot currently be recorded on a job at all. Four questions are
outstanding with the owner; see `/memories/repo/productivity-splits.md` for the full gap
list. Nothing was invented to fill them.

---

## v1.1.0-rc.23 — One person's typos could lock the whole workshop out of login — **RELEASE**

**Release type:** PRODUCTION

**Reported by the owner:** a phone screenshot of `Too many login attempts from this IP. Please try again after 15 minutes.`

### Nobody chose this. It is a default key generator meeting an unconfigured proxy

The login limiter used `express-rate-limit`'s **default key, `req.ip`**. `trust proxy` is never set in `server.ts`
(there is no `app.set("trust proxy", …)` anywhere, and `TRUST_PROXY` — which
[ENVIRONMENT_VARIABLES.md](../deployment/ENVIRONMENT_VARIABLES.md) documents as "Value: 1" — **is not on the
service at all**, so even reading it would do nothing). Express therefore ignores `X-Forwarded-For` and `req.ip`
returns the **Cloud Run front-end's own address, identical for every caller**.

That silently turned "10 attempts per IP" into **one shared budget of 10 attempts per 15 minutes for the entire
company**, staff on mobile data included.

**The library has been reporting it on every request**, and we did not act on it:

```
ValidationError: The 'Forwarded' header (standardized X-Forwarded-For) is set but currently being ignored.
Add a custom keyGenerator to use a value from this header.
code: 'ERR_ERL_FORWARDED_HEADER'   (also ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
```

**OBSERVED 2026-09-16:** nine failed attempts from **two different phones** (users 91 and 68) between 12:43 and
12:46 consumed that shared budget and locked out everyone else. The `login_history` rows prove the two devices
were on different IPv6 addresses, i.e. the bucket is not per-workshop either — it is per front-end.

**WHERE IT CAME FROM:** commit `b331acd`, 2026-07-09, whose message is *"Merge attendance/overtime tabs, fix user
management font color, fix vehicle lookup token header, fix layout alignment bugs"* — a UI-fixes bundle, not a
security decision. There is no ADR and no decision-log entry; `docs/` mentions rate limiting exactly once, in an
unrelated line. The `max: 10` / 15-minute figures are a conventional snippet, not a tuned value.

**AND THE CODEBASE ALREADY KNEW.** `src/middleware/rate-limiter.ts` documents this exact hazard and deliberately
avoids it for the AI routes:

> *"since staff share the dealership's NAT egress IP on site WiFi, the whole workshop would have collapsed into
> one bucket and throttled each other."*

The login limiter was left on the library default.

### The fix

- `keyGenerator` now keys on the **normalised username**. One person's typos can no longer shut anybody else out,
  while brute force against a single account is still throttled — which is what the limit is for. It also no
  longer depends on the proxy chain at all, so it is correct whether or not `trust proxy` is ever configured.
- The fallback for a body with no username uses the **socket peer rather than `req.ip`**, so the library's
  trust-proxy validation cannot fire and such a request cannot lock a real user out.
- **`skipSuccessfulRequests`** — a correct credential is proof the caller is not the attacker this guards
  against, so it no longer counts against the budget.
- The message no longer claims to be IP-based: *"Too many failed sign-in attempts for this account."*

**`trust proxy` is deliberately NOT set in this change.** Choosing a value needs the real `X-Forwarded-For` hop
count measured against production first; a wrong number either preserves this bug or lets a caller spoof its own
address. Fix the key, not the hop count.

**Gates:** `lint:fabrication` PASS (889 files, 0 errors). `tsc --noEmit` — the same 9 pre-existing errors, none
in `server.ts`.

---

## v1.1.0-rc.22 — Approving attendance was destroying the evidence; face verification has been dead since 2026-09-14 — **RELEASE**

**Release type:** PRODUCTION

**Reported by the owner:** *"ok lets come to attendance"*, then *"we need the image also to be viewed while
approving also the location"*, then — looking at Shashi Kumar's row — *"it shows punched inside the workshop
then why manual approve is required what blocks auto approve"*.

### 1. APPROVING A PUNCH WAS OVERWRITING THE PUNCH — data-integrity bug, already corrupting live data

`POST /api/workforce/attendance` ends its branch chain with `else { record.check_in = check_in || timestampStr; }`.
An **approval** payload carries `is_approved` and no `check_in`/`check_out`/`face_photo`, so `is_edit`,
`is_break*` and `is_check_out` were all false and the approval **fell through to that branch**, which then
wrote the *current* IST wall-clock over the recorded arrival time and set `check_in_lat/lng`,
`face_photo_in` and `face_match_score_in` to `null`.

Proven from `tbl_edit_audit` for `attendance_id` 40 (ABDUL GANI SHEK, 2026-09-16) — in every row the recorded
`check_in` equals the IST wall-clock *at the moment of that write*:

| created_at (UTC) | = IST | action | `check_in` written | by |
| --- | --- | --- | --- | --- |
| 03:51:22Z | **09:21** | SELF_PUNCH | 09:21 | ABDUL GANI SHEK |
| 07:37:34Z | **13:07** | APPROVE_ATTENDANCE | 13:07 | sayeed (`gm_service`) |
| 12:51:53Z | **18:21** | APPROVE_ATTENDANCE | 18:21 | AHMED HUSSAIN (`workshop_manager`) |

**His genuine 09:21 punch now reads 18:21**, with no face photo and no GPS — the approval destroyed the
evidence it approved. Five approved rows carry that signature and **two have `check_in` LATER than
`check_out`**, which no real punch can produce.

**Fix:** approvals no longer reach that branch. A new `else if (isApprovalAction)` arm handles a pure
approval as the governance action it is — it flips `is_approved` (and may carry `status`/`notes`) and
touches nothing else. `is_edit` remains the one sanctioned path for changing a recorded time, which is
what keeps the rule that **nobody may rewrite their own punch** intact.

### 2. Every attendance audit row was unreviewable — `before_json` was never captured

`logEdit` supports `before:` and the user / employee / job-card call sites all pass it; the attendance call
site did not, so **0 of 112** attendance audit rows carried a `before_json`. You could see who changed a
punch and what they set, but never what it had been. Now the record is snapshotted before any mutation.

### 3. The approver could not see the photo or the location they were vouching for

`ATT_READ_COLS` deliberately omits `face_photo_in`/`face_photo_out` to keep the day payload small, but the
screen rendered an `<img>` from `r.face_photo_in` anyway — so the "Verif. Face" column was **permanently
dead**. And "Approve" posted immediately, showing nothing.

- The list now returns cheap **existence flags** (`has_face_photo_in`/`has_face_photo_out`), so the column
  offers the photo on demand instead of a dead "—".
- **New `GET /api/workforce/attendance/:attendanceId/evidence`** returns, for one record: both punch photos,
  the enrolled reference photo, the match scores, both GPS fixes, the **real geofence verdict** (computed
  from the configured polygon — reported as `null` when no perimeter is configured, never a fabricated
  "inside"), the distance from the perimeter centre, and the record's amendment trail. RBAC is enforced
  server-side: the employee may see their own, and `ATTENDANCE_APPROVE_ROLES` may see it too.
- **Approve now opens a review panel** showing the punch photo beside the enrolled reference it was compared
  against, the location with a map link, the geofence verdict and the amendment history — then the Approve
  button. The panel states plainly that approving changes the flag only, not the recorded time.
- `ATTENDANCE_APPROVE_ROLES` was hoisted to one shared definition so the POST handler and the evidence route
  cannot drift apart.

### 4. **"Pending Override" could never appear** — `is_approved` is a NUMBER

`workforce_attendance.is_approved` is `tinyint(1)`, and mysql2 returns **`0`/`1`, not `false`/`true`**. The
badge tested `r.is_approved === false`, so that branch was **dead** and every punch whose verification did
not pass displayed as **"Manual Entry"** — i.e. "a supervisor typed this in" — mislabelling *exactly* the
rows a manager must review. `null` is the only value that genuinely means a manual entry. Normalised with
`Number(v) === 1`, and the badge now reads **Approved / Pending Review / Manual Entry**. It also said
**"Auto-Approved"** on manager-approved rows; "Approved" is true either way.

### 5. WHY AUTO-APPROVAL IS BLOCKED — and it cannot be fixed by changing the model

The owner's question was exactly right and the location was never the reason. Auto-approval is
`matched === true && faceMatchScore >= 0.7 && isWithinGeofence`, so a good GPS fix is only ever a
**necessary** term; being inside the perimeter can never approve anything on its own.

The real blocker: the face check sends **two images in one prompt** (reference + punch photo) and the
provider rejects it —

```
Face verification unavailable: Nemotron returned HTTP 400.
{"error":{"message":"At most 1 image(s) may be provided in one prompt. (parameter=image)","code":400}}
```

The catch block then sets `faceMatchScore = 0.0; autoApproved = false`. **That fail-safe is correct and
deliberate** — a check that cannot run must never read as a check that passed — so every affected punch is
sent to a manager, with the reason visible only in Cloud Logging.

**Dated regression.** `face_match_score_in` is `0.95` (a real comparison) from 2026-09-06 to 2026-09-13, and
**`0` from 2026-09-14 onward**. Commit `877d3de` — *"feat(ai): move every AI feature to NVIDIA Nemotron,
remove Gemini and DeepSeek"* — introduced `NEMOTRON_VISION_MODEL = nvidia/nemotron-parse-2.0`, a **document
parser**, which — like every model tested — accepts only one image. From that commit, **no punch with an
enrolled reference photo can auto-approve.**

Verified by direct 2-image calls against the live API (1×1 placeholder images; no employee data sent):
`nvidia/nemotron-parse-2.0` → 400, and `meta/llama-3.2-11b-vision-instruct` → **400 with the identical
request-validation message**. Two independent model families, one error carrying a `param` field ⇒ this is a
**provider-route constraint, not a model choice**; swapping the model will not fix it. Restoring face-based
auto-approval needs a stitched single image (no image library is installed) or a different provider.
**Not fixed here — it needs a product decision, and no behaviour was faked to hide it.**

### 6. Score semantics — a `0` is not a mismatch and a `1` is not a perfect match

| score | rows | actual meaning |
| --- | --- | --- |
| `1` | 22, approved | the **unrun default** — `!employee.profile_photo`, so the **first check-in enrolled the photo and auto-approved with no verification at all** |
| `0.95` | 17 approved + 2 pending | a real comparison (approved); the 2 pending are correctly **blocked by the geofence** — `attendance_id` 6 and 32 sit at 17.385/76.861 and 17.190/77.037, far from the workshop (~17.315/76.902) |
| `0` | 7 pending | the provider 400 |

So the highest scores belong to the *least* verified records. The review panel therefore **shows the match
percentage only when a punch photo actually exists** — otherwise the stored `1` would read as a "100% match"
next to "no photo", a claim that never happened. `review_reason` is now derived from the record's own stored
values so a manager is told *why* each flag exists instead of having to ask.

### Also

`NEMOTRON_VISION_MODEL` is shared by five call sites (OCR and document parsing send one image and work fine),
so it was deliberately **not** changed — that is why the fix must be scoped to the face check.

**Gates:** `lint:fabrication` PASS (889 files, 0 errors). `tsc --noEmit` — **the same 9 pre-existing errors**
(2× `EmployeeDirectory.tsx`, 6× `engines/vehicle-passport/index.ts`, 1× `lib/auth.ts`), none in the files
touched here.

---

## v1.1.0-rc.21 — Staff Activity now live-refreshes, and punches vs sign-ins explained — **RELEASE**

**Release type:** PRODUCTION

**Reported by the owner:** *"plz check the staff activity why it is not updating in realtime, abdul gani's
punches showing as 10 but last login signin is not recorded what does it mean"*.

### The staleness was real — my gap

The screen fetched **once on mount** (`useEffect(..., [load])`) and never again. Anything that happened while it
was open — a punch, a sign-in, an action — stayed invisible until someone pressed Refresh. A report about live
systems that never updates reads as stale, which is exactly how it was read.

It now polls **every 60 seconds**, matching the notifications poll rather than the 10s operational dashboards:
this is monthly aggregate reporting, not a live queue, and a faster cadence would re-scan 61 accounts plus five
grouped aggregates for no benefit. The poll is skipped while the tab is hidden, uses a silent path so it cannot
flash or blank the table mid-read, refreshes an open drill-down too, and the header now states when the data was
fetched. The polling effect is declared *after* `openDetail` deliberately — the dependency array is evaluated
during render, so referencing it earlier would hit the temporal dead zone.

### Abdul Gani: both numbers were right

`ABDUL GANI SHEK` (`dev-206`, user 51, employee_id 1, role `BD ASSISTANT/ DRIVER`) held **10 attendance
punches** (5–16 Sep, all Present) and **zero sign-in rows**. They are recorded by three independent systems:

| What | Table | Keyed on | Recording since |
| --- | --- | --- | --- |
| Attendance punch | `workforce_attendance` | `employee_id` | long before today |
| Sign-in | `login_history` | `user_id` | **today, 12:06 IST** |
| Platform actions | `jc_activity_log`, `security_audit_logs` | actor id | — |

So **10** is his punch-days across twelve days, and **Never recorded** means no sign-in has been captured since
the cutover. His most recent punch was written at `03:51:22Z` = **09:21 IST** — before recording began, on a
session already open — so it produced no login row. The banner now leads with that independence: *"Sign-in,
attendance and activity are recorded by three INDEPENDENT systems — a punch does not imply a recorded
sign-in."*

### One thing found and deliberately NOT changed

`check_in` normally matches `created_at` converted to IST (8 Sep: `09:38` vs `04:08:37Z`). Two rows do not —
`attendance_id` 40 and 36 both carry `check_in = 13:07` while their `created_at` convert to 09:21 and 09:18 IST.
The same value on two different days looks like a manual `EDIT_ATTENDANCE_TIME`, which the endpoint supports.
Editing a punch time is legitimate, so this is flagged rather than "corrected" — but it means **a punch time
cannot always be re-derived from the row's creation time**.

---

## v1.1.0-rc.20 — "Never recorded" was correct, but the screen didn't say why — **RELEASE**

**Release type:** PRODUCTION

**Asked by the owner:** *"LAST SIGNIN SHOWS NEVER RECORDED ?"*

**It was correct behaviour — and here is the proof rather than the assurance:**

| | |
| --- | --- |
| The viewer's session (`user_id` 30, `developer`) was issued | **06:10:59 UTC = 11:40:59 IST** |
| Login recording went live | **06:36:06 UTC = 12:06:06 IST** |

The session was issued **25 minutes before the feature existed**, and a session is a **24-hour JWT**, so no
new sign-in had occurred. `login_history` held 6 rows, **four of them real successful sign-ins that day**
(users 94, 29, 21, 55) — recording demonstrably worked. Both `jwt.sign` sites that mint a session are
instrumented, so no login path was missed. The token's `iat` was decoded out of the browser, not inferred.

**The screen explained itself badly, and that part was mine:**

1. The banner was gated on `rows.every(r => !r.last_login_at)`. As soon as a few people signed in the
   condition went false and **the explanation vanished** — leaving a bare "Never recorded" with no context
   for everyone else. Now `.some(...)`, so it persists while any account is still unexplained.
2. The copy states the actual reason — 24-hour session tokens — instead of only "recording started today",
   and names the exact cutover time.
3. The viewer's own row is marked **"you"** and reads *"This session predates recording"* with an
   explanatory tooltip, instead of the identical bare text everyone else receives.

**To populate your own row: sign out and sign back in.** Nothing else is needed.

**Also verified end-to-end while diagnosing:** the rc.19 timezone fix renders correctly in the live UI —
HR DAPL 1:09 pm (07:39:18Z), MUSTAFA 1:10 pm (07:40:00Z), sayeed 1:08 pm (07:38:31Z), SHASHI KUMAR
1:05 pm (07:35:51Z), Suryakant 12:15 pm (06:45:20Z). Every one previously read 5h30m early.

---

## v1.1.0-rc.19 — timestamps rendered 5h30m early; instants and wall-clock separated — **RELEASE**

**Release type:** PRODUCTION

**Reported by the owner:** *"there is something with the time issue check the time and synchronise with the
the location we live and match timezone of server, db, everything accordingly"*.

### The clock, measured

| Layer | Timezone |
| --- | --- |
| Cloud SQL | `@@system_time_zone = UTC`, `NOW() == UTC_TIMESTAMP()`, offset `00:00:00` |
| Cloud Run container | UTC |
| Viewer's browser | `Asia/Calcutta`, UTC+05:30 |

**The database and server agree and are correct.** The defect is that the UTC-ness is discarded on the wire:
`src/db/index.ts` sets `dateStrings: true`, so MySQL returns a DATETIME as `"2026-09-16 06:45:20"` with **no
timezone marker**, and JavaScript parses a bare string like that as **local** time. Measured in the live
browser:

```
new Date("2026-09-16 06:45:20")  →  2026-09-16T01:15:20.000Z     ← 5h30m early
```

A sign-in that really happened at **12:15 IST** was displayed as **06:45**.

### The blanket fix was written, then reverted — and why

The obvious fix is one Express JSON replacer labelling every `YYYY-MM-DD HH:mm:ss` as UTC, which would repair
~300 call sites across 97 files at a stroke. It was written, then checked against the data before shipping,
and **reverted**, because this schema holds **both kinds of datetime in the same table**:

- `job_card_master.created_at` / `updated_at` span hours **0–6** → UTC **instants** (09:30–15:30 IST)
- `job_card_master.crm_arrival_at` / `crm_jc_started_at` / `crm_jc_completed_at` hold **10:00, 11:15, 15:15,
  17:30** → **local wall-clock**, because `/api/job-cards/:no/crm-timestamps` parses the literal CRM digits
  precisely to avoid `Date()` re-interpreting them. Its own comment says *"Wall-clock, never an instant"*.

Labelling those wall-clock columns as UTC would have shifted them **+5h30m**, breaking values that read
correctly today. The blanket rule would have traded one wrong-screen class for another, silently.

### What was fixed instead — surgically

1. The three fields that are **genuine instants** — `login_history.login_at`, `jc_activity_log.created_at`,
   `security_audit_logs.created_at`, all written by `NOW()`/`CURRENT_TIMESTAMP` — now carry their UTC label.
2. The report's **calendar maths uses the site's timezone**, not the server's UTC clock. "Working days
   elapsed" and "this month" previously disagreed with the shop floor for the first 5h30m of every day and
   every month.
3. `StaffActivityHub` formats **explicitly in `Asia/Kolkata`** rather than the viewer's device timezone, so
   the same event cannot read differently on two machines. The punch list is labelled as gate wall-clock and
   is deliberately **not** converted.

**Verified live through the owner's own session:** `GET /api/admin/user-activity/staff` now returns
`login_at: "2026-09-16T06:45:20Z"` (renders **12:15 IST**, previously 06:45) and `working_days_elapsed: 14`
for September — correct for 1–16 Sep excluding two Sundays.

### Still open — this needs a decision, not a sweep

~300 call sites in 97 files still render a bare DB datetime through `new Date(v).toLocaleString()`, so most
screens still show instants 5h30m early. Live example: `gate_out_time = 2026-09-06 22:15:00` UTC is really
**07 Sep 03:45 IST**, and it displays as 22:15.

The correct fix is to **classify every datetime column once** as instant-or-wall-clock, then normalise on
that basis — a schema-semantics exercise, not a regex. Recorded rather than guessed.

---

## v1.1.0-rc.18 — the top-bar search box, which had never been wired — **RELEASE**

**Release type:** PRODUCTION

**Reported by the owner:** *"what use it of that search tab on the top besides back button"*.

**Answer: none.** Verbatim, the input was:

```jsx
<input type="text" placeholder="Search..." className="..." />
```

No `value`, no `onChange`, no handler, no state — and nothing in `App.tsx` or `AppShell.tsx` referenced any search variable. It had never been wired. Typing in it and pressing Enter did nothing, and never had.

**Fix:** it is now a **jump-to-screen launcher**. It filters the screens *this role can already see*, matching on screen label or workspace label, with Enter opening the first match, Escape clearing, and an honest "No screens match." empty state.

**Deliberately scoped to `permittedTabs`** rather than a cross-database search. That gives no new endpoints, no new permissions, and no data semantics to guess at — and because it can only reach a screen the role already has, **it cannot become an access path**, so it needs no server-side enforcement of its own.

The wider search the owner may have wanted — job cards by number/VRN, people, vehicles — needs endpoint and matching decisions, so it is left open rather than half-built.

---

## v1.1.0-rc.17 — Staff Activity existed but was unreachable — **RELEASE**

**Release type:** PRODUCTION

**Reported by the owner:** *"where can i find staff activity"*.

Fair question — the tab had shipped in rc.15. It was in `ROLE_TABS` for admin/developer/gm_service, it had a render block, and it was verifiably present in the served bundle. **It was still unreachable.**

It had never been added to `WORKSPACE_MAPPING` in `AppShell.tsx`, and the sub-nav renders only tabs whose mapping equals the active workspace:

```js
permittedTabs.filter(t => WORKSPACE_MAPPING[t.id] === activeWorkspace)
```

An unmapped tab matches **no** workspace, so it appeared in **no menu at all** and could only be opened by typing `/staff-activity` into the address bar. That is the fourth condition for a screen being reachable — the role has the tab, nothing filters it, a render block exists, **and the tab is assigned to a workspace** — and it is the one that lives in a different file from the other three.

**Fix:** mapped to `hr`, alongside `employees` / `employee-performance` / `productivity`. All three intended roles already carried other `hr` tabs, so the workspace was already visible to them. Verified in the served bundle:

```
...grievance:"hr","staff-activity":"hr",assistant:"admin",...
```

**Audited for the same mistake elsewhere:** every tab id referenced in `App.tsx` (44 of them) was compared against the workspace map. The **only** one without a mapping is `logout-deep-link`, the intentional Logout pseudo-tab that the nav excludes by design. Staff Activity was the only invisible screen, so this was a single mistake rather than a class.

**Note for anyone adding a tab:** `src/lib/tabRoutes.ts` needs no change — a tab id *is* its path. `WORKSPACE_MAPPING` does.

---

## v1.1.0-rc.16 — the login trail recorded an internal address, not the client — **RELEASE**

**Release type:** PRODUCTION

Found by exercising the new login trail against production rather than trusting it. Migration 32 applied,
the foreign key was gone, the insert succeeded — and every recorded row carried `ip_address`
**`169.254.169.126`**, a link-local address belonging to one of Cloud Run's internal hops.

Express with `trust proxy=1` resolves `req.ip` to the **last** entry in `X-Forwarded-For`. Cloud Run puts the
real client **first** and appends its own hops after it, so the last entry is infrastructure. Now takes the
leftmost entry, falling back to `req.ip`.

The code comment records that this value is a client-supplied **claim** — a caller can send its own
`X-Forwarded-For` — which is acceptable for an audit record but must never drive an authorisation or
rate-limiting decision.

Worth stating plainly: the migration, the FK removal and the insert were all correct, and the column was
still useless. Only a live request showed it.

---

## v1.1.0-rc.15 — staff activity reporting; and a security override built on my own error — **RELEASE**

**Release type:** PRODUCTION

**Requested by the owner:** *"can i also see the user activity like his compliance report, when did he login
did he punched attendance, how much active he is"*, visible *"only to the developer and gm service and
hr/admin"*.

### The correction, first — I was wrong, and it granted a security control away

In rc.13 I added `"reception"` to `GATE_OUT_SECURITY_ROLES`, stating that production had **zero
`security_agent` accounts**. **That was false.**

**`suryakant` (user 45) is an active `security_agent`** with a valid bcrypt password and
`must_change_password = 0`. My probe counted security users through a `LEFT JOIN` onto `roles` and returned
0; I trusted the count without querying the account table directly. *A zero from a join is evidence about the
join, not about the world.*

The consequence was not theoretical. It handed a **front-desk role the ability to release a vehicle** — a
security control, given away on a false premise.

The real defect was never a missing account. `security_agent` was **already** in `GATE_OUT_SECURITY_ROLES`,
so the API always accepted it — but `ROLE_TABS.security_agent` had **no `security-workspace` tab**, and the
only caller of `POST /api/gate-out/gate-out` is `SecurityWorkspace.tsx:63`, rendered solely on that tab id.
**The role held the authority and could not exercise it.**

- `security_agent` **and** `gate_personnel` now have the `security-workspace` tab — the exit step has its
  proper operator. Tab set and API role set are kept aligned deliberately: a tab without the API role is a
  button that 403s, an API role without the tab is unusable authority. Both shipped as bugs here.
- **`"reception"` removed** from `GATE_OUT_SECURITY_ROLES`, and the tab removed from `ROLE_TABS.reception`.
- The journey was unaffected: the GM (`sayeed_dp`) holds `security-workspace` and `cashier-workspace`, so one
  login still covers payment → gate pass → gate-out.

### New: staff activity reporting

- `GET /api/admin/user-activity/staff?days=N` — the roster: last sign-in, sign-in and **failed** sign-in
  counts, attendance punches/late/overtime for the month, action counts, usage score.
- `GET /api/admin/user-activity/:userId?days=N` — drill-down: recent sign-ins with IP, recent punches, recent
  job-card and audit actions.
- New screen `StaffActivityHub.tsx` at `/staff-activity`, registered for **admin, developer, gm_service** and
  enforced independently in the router. There is **no `hr` role** in `roles`; the HR account `hr_dapl`
  carries `admin`. Deliberately **not** widened to `workshop_manager`/`floor_supervisor` — this is personal
  performance data about named employees.
- Handlers live in `src/api/routes/user-activity.routes.ts`, built by a `createXRouter` factory (the auth
  helpers are closure-local in `server.ts`) and **mounted**.
- Assembled from **five grouped queries merged in JS**, not one wide join: the sources key on `employee_id`,
  `user_id` and `actor_user_id` differently, so a join multiplies rows and produces counts that look
  plausible and are wrong.
- Attendance queries list columns **explicitly**. `workforce_attendance` carries `face_photo_in`/`out` as
  **LONGTEXT base64**; `SELECT *` would pull hundreds of KB per row (the trap that once hung
  `/api/employees`), and a performance report is no place to surface someone's biometric capture.

### New: logins are recorded at all — `login_history` could never have worked

`login_history` has existed since the first schema with exactly the right shape and held **0 rows**. It could
not have held any: `user_id` is **NOT NULL with an FK to `users`**, but the app authenticates against
`user_access_master`, and **only 19 of 61** production accounts exist in `users`. An insert for the other 42
would have failed with `ER_NO_REFERENCED_ROW`. Confirmed for the accounts that matter: **29 (HR/admin),
45 (security), 50 (biller), 95 (advisor), 96 (floor supervisor) are all absent from `users`.**

**Migration 32 `login_history_relax_fk`** drops that FK — an append-only log should not refuse to record a
sign-in because the subject sits in the other identity table — and adds
`idx_login_history_user_time (user_id, login_at)`. `/api/auth/login` and `/api/auth/verify-otp` now record
**success and failure**, and the write **never throws**: an audit side-effect must not deny a valid user
access.

**There is no backfill, deliberately.** Past sign-ins are unrecoverable, so `last_login_at` is null for almost
everyone until they next sign in. The screen says "Never recorded" and explains why. Inventing that history
would be fabrication.

**Verified end-to-end against production:** a deliberate failed sign-in for `suryakant` (user 45, absent from
`users`) returned 401 and wrote row 1 — an insert that would have been rejected hours earlier.

### Fixed: Employee Performance "Completed" column was permanently 0

It compared job status to the literal `"completed"`, which **cannot exist** — `job_status` is an ENUM of
`Open / In Progress / Waiting Parts / Ready / Delivered / Carry Forward / Assigned / Unassigned / In Queue`.
Now uses `isWorkCompleteStatus()` from `src/types.ts`, whose own docstring says it replaces exactly that
comparison. The name match is also trimmed and case-insensitive now: production stores names with trailing
spaces (`'ranjeet '`), so the exact compare was attributing zero jobs to real people.

---

## v1.1.0-rc.14 — a permission with no screen, and a hardening profile that was never running — **RELEASE**

**Release type:** PRODUCTION

**Reported by the owner:** *"while this is the developer login everything here needs every access"*.

The premise was wrong. Checking it properly turned up three things: one of the owner's assumptions was
mistaken, one defect was mine, and one **production-wide misconfiguration** had been invisible since it was
written.

> **This entry was corrected on 2026-09-16, the same day, after verifying the deployed bundle rather than
> the source.** The correction is left visible rather than quietly rewritten, because the original claim
> was the kind that sounds plausible and is easy to repeat.

### First: which login

The tab was signed in as **`sayeed_dp` (user 21, `gm_service`)** — not the developer login. Confirmed by
reading `dwip_auth_user` out of localStorage, not by assumption. The only **active** developer account is
`wmsdmworkshop@gmail.com` (user 48); the older `developer` account (user 30) is deactivated. The GM and the
developer are both named Sayeed, which is how the two get confused.

**And the developer login already had everything.** See Defect 2 — nothing was being hidden from it.

### Defect 1 — two nav filters disagreed, but neither of them was running

`excludedTabs` was written out **twice with different behaviour**:

- the redirect guard exempted `admin`, `developer`, `dealer_principal`, `gm_service`, `workshop_manager`;
- the sidebar filter exempted **nobody**.

**Fix:** one definition. `RC1_EXCLUDED_TABS` + `RC1_TAB_EXEMPT_ROLES` behind `isRc1TabHidden()`, used by
both call sites, so they cannot diverge again. `AGENTS.md` records this as a landmine — *"change both
occurrences or neither"* — and a single definition removes the choice.

> **⚠ CORRECTION, 2026-09-16.** This entry first claimed that `developer` was *"silently losing six tabs in
> production"*. **That was wrong**, and it was disproved by checking the deployed artifact rather than the
> source. See the next section. The dedup is real and worth keeping, but **it is a no-op in production.**

### Defect 2 — the rc1 hardening profile is dead code in production

Found while verifying that rc.14 had actually shipped. The served bundle contains **zero** occurrences of
`"rc1"` and **zero** of `"dev"`, and the excluded-tabs array literal is absent entirely.

**Cause:** `.dockerignore` **and** `.gcloudignore` both carry:

```
.env
.env.*
!.env.example
```

`.env.rc1` — the only file that sets `VITE_WORKFORCE_PROFILE=rc1` — is excluded from the Cloud Build upload
and from the Docker context, **and** is gitignored as well. `npm run build:rc1` runs `vite build --mode rc1`,
which loads no env file at all, so `VITE_WORKFORCE_PROFILE` is `undefined`, `undefined === "rc1"` folds to
`false`, and esbuild eliminates the guard as dead code.

Every `VITE_WORKFORCE_PROFILE === "rc1"` check in the codebase is therefore permanently false in
production — the `App.tsx` tab guard **and** `AttendanceShiftLog.tsx`.

**This is not an outage.** The net effect is permissive: nothing is hidden, which is why nobody noticed. But
it means the production-hardening configuration has been **documentation rather than behaviour**, and
`.agents/AGENTS.md:158` (which states production builds with the rc1 profile) is factually wrong.

**Held for the owner — deliberately NOT changed.** There are two honest resolutions:

1. pass `VITE_WORKFORCE_PROFILE` through a Docker `ARG`/`ENV` or a Cloud Build substitution, so the flag
   survives the context exclusion; **or**
2. accept that rc1 is inert and remove the dead checks.

Option 1 would **hide** six tabs in production — the opposite of what was asked for — so switching it on is
an owner decision, not a silent fix. `.env.*` must stay dockerignored either way: excluding env files from
the image is the right instinct, and `.env.rc1` merely happens to carry no secret, which is the only reason
a build flag could ride along with it.

### Defect 3 — this one was mine

**rc.13 granted reception a permission with no way to use it.**

`POST /api/gate-out/gate-out` — the call that actually releases a vehicle — has **exactly one caller in the
entire repository**: `SecurityWorkspace.tsx:63`, which renders only on
`activeTab === "security-workspace"`. And `ROLE_TABS.reception` held only `vehicle-lookup` and `gate-entry`.
`MyWorkspace.tsx` has **zero** gate or security references, so there was no fallback path either.

Reception held the authority and had nowhere to use it. A permission is only real if the role also has a way
to reach the screen that exercises it.

**Fix:** `security-workspace` added to `ROLE_TABS.reception` — to `reception` **only**, not `receptionist`.
Granting the tab to a role the API does not authorise would create the inverse defect: a button that 403s.
(`security-workspace` is absent from `TAB_MODULE_MAPPING`, so `isTabPermitted()` passes it through.)

### Also learned

`security_agent` and `gate_personnel` do **not** have that tab either. Only `admin`, `developer`,
`workshop_manager`, `service_manager`, `gm_service` and `dealer_principal` do — so gate-out has in practice
been worked by admin and the GM, not by security.

**Verified in the live artifact, not just in source:** the served bundle contains
`reception:[{vehicle-lookup},{gate-entry},{security-workspace}]` while `receptionist` immediately after it
does not — exactly as intended, and it proves rc.14's nav half actually shipped.

**The open question this raised, for the owner:** `service_manager`, `supervisor` and `floor_supervisor` also
have `breakdown` spliced in by the `ROLE_TABS` loop but are not in `RC1_TAB_EXEMPT_ROLES`. That only matters
if rc1 is ever switched on (see Defect 2) — today nothing is hidden from anyone.

---

## v1.1.0-rc.13 — reception works the exit step, because nobody else could — **RELEASE**

**Release type:** PRODUCTION

**Owner instruction, 2026-09-15:** *"cashier does not exist right now we can give over ride to gm, security
login can be overide by reception for now"*. One half needed a change. The other half did not, and saying
so is part of the record.

### The cashier half needed nothing

`GATE_PASS_ISSUE_ROLES` already contains `gm_service`, and under the 2026-09-14 settlement rule only
`developer` and `gm_service` are exempt from full settlement. The GM (`sayeed_dp`, user 21) could already
record payment and issue the gate pass. **No code change was made for this**, and none was needed.

### The security half did

```
GATE_OUT_SECURITY_ROLES =
  [admin, developer, gm_service, workshop_manager, security_agent, gate_personnel]
```

Production has **zero** active users in `security_agent` and **zero** in `gate_personnel` — verified by
query, not assumed. The exit step had no operator at all, so **no vehicle could be gated out**, by anyone.
The stage was not slow or awkward; it was unreachable.

`"reception"` was added to the list.

### What that grants — stated plainly

Reception (`AFROZ`, `dev-328`) can now call:

| Endpoint | Effect |
| --- | --- |
| `POST /api/gate-out/gate-out` | **releases a vehicle** |
| `POST /api/gate-out/evidence` | records the rear-plate capture behind it |
| `GET /api/gate-out/security-queue` | reads the security queue |
| `POST /api/gate-out/claim-task` | claims the **SECURITY** task |
| `GET /api/gate-out/gate-pass-ready` | lists gate-pass-ready vehicles |

That is a security control moved to a front-desk role. The comment in `server.ts` and the commit message
both say so, so a future reader meets the warning at the code, not only here.

**To revert:** delete `"reception"` from `GATE_OUT_SECURITY_ROLES`. The correct permanent fix is a user
account in `security_agent` — an account in the right role, not a widened role list.

---

## v1.1.0-rc.12 — a validator that could never be satisfied — **RELEASE**

**Release type:** PRODUCTION

**Reported by the operator, verbatim:** `2 blocker(s) - [BV_LABOUR_PRESENT] No labour/service items on
job. - [BV_COMMERCIAL_TAMPERING] Server-recomputed grand_total 0 ≠ stored 2360.`

### The defect

Both blockers came from `billingValidate()`. Neither described a real problem, and neither could ever
clear — so the Validate button was a dead end no matter how correct the pre-invoice was.

The validator read `job_card_service_item` and `job_card_parts`. **Nothing in the codebase writes to
either table.** Both hold zero rows. The pre-invoice's labour was real — it was captured as
`job_card_master.estimated_amount = 2000.00` and priced on the pre-invoice as ₹2,000 labour + ₹360 GST =
₹2,360 — but the validator never looked there.

`BV_COMMERCIAL_TAMPERING` is the more dangerous of the two, because it is a *commercial control*. With a
zero recomputed total and a stored ₹2,360, it was comparing the wrong number to the right one and calling
the difference tampering.

This is a **repeat**: the sibling check `checkPhase8Readiness()` in the same file had already been
retargeted away from these empty tables during rc.8/rc.9 for exactly this reason. This validator was left
behind when its sibling was fixed.

### The fix

- `BV_LABOUR_PRESENT` passes on **itemised rows OR the pre-invoice's own totals OR the captured
  `estimated_amount`**.
- `BV_COMMERCIAL_TAMPERING` uses `capturedEstimate` as the labour fallback when `SUM(labour_amount) = 0`,
  so the comparison runs against a real number and **tamper detection is preserved, not disabled**.

### For owner review

`BV_COMMERCIAL_TAMPERING` is a control that catches a server-recomputed total disagreeing with a stored
one. rc.12 changes **what it compares**, not whether it compares — but that is still a change to a
commercial control's data source, and it is flagged here so it is a conscious decision rather than a
silent one.

---

## v1.1.0-rc.11 — "Invalid jobId" — **RELEASE**

**Release type:** PRODUCTION

### The defect

The operator clicked Compile and the screen answered `Invalid jobId`.

A naming mismatch across a boundary. The engine's `getReadyFromQcQueue()` selected `job_card_id`, but
`SAPreInvoicePanel` reads `j.job_id` from each row. The panel therefore sent the **literal string**
`"undefined"`, `parseInt` produced `NaN`, and the route answered **400**.

Nothing was wrong with the engine, the route, or the permissions. Two halves simply used different names
for the same column.

### The fix

`SELECT job_card_id AS job_id, ...` — the alias the caller actually reads.

---

## v1.1.0-rc.10 — the billing queue can finally return a row — **RELEASE**

**Release type:** PRODUCTION

**Found before the advisor clicked Compile**, by calling `/api/billing/my-queue` as the biller. Had we
not, the journey would have reached Billing and found a 500 instead of a job.

### The defect

`BillingEngine.getBillingQueue()` LEFT JOINs `tbl_handoff_sla`:

```sql
LEFT JOIN tbl_handoff_sla sla
  ON sla.entity_id = CAST(pi.pre_invoice_id AS CHAR)
 AND sla.stage_name = 'SLA_SA_TO_BILLING'
```

`tbl_handoff_sla.entity_id` is `utf8mb4_0900_ai_ci`. A bare `CAST(... AS CHAR)` takes the **connection**
collation (`utf8mb4_unicode_ci`), and MySQL refuses to compare the two:

```
Error 1267: Illegal mix of collations (utf8mb4_0900_ai_ci,IMPLICIT)
            and (utf8mb4_unicode_ci,IMPLICIT) for operation '='
```

So `GET /api/billing/my-queue` returned **HTTP 500 for every caller, always** — the queue has never
been able to show a handed-off pre-invoice.

The same file already carried the correct form in `checkPhase8Readiness()`
(`CAST(? AS CHAR) COLLATE utf8mb4_0900_ai_ci`); the `COLLATE` was simply never applied to this JOIN.
This is the trap already recorded in the project's own notes — a bare `CAST` uses the connection
collation, not the column's.

### Why it stayed hidden

The Billing screen renders **"No pre-invoices handed off to billing yet."** when the queue call fails.
Because `tbl_pre_invoice` was *also* genuinely empty, that message was indistinguishable from the
truth. It would have stayed "correct" straight through the first real handoff — the failure was
scheduled to surface at exactly the moment the operator first had something to bill.

### The fix

One `COLLATE utf8mb4_0900_ai_ci` on the CAST, matching the precedent in the same file.

**Proved against production before deploying:**

| Query | Result |
| --- | --- |
| old (no COLLATE) | `ER_CANT_AGGREGATE_2COLLATIONS` |
| new (with COLLATE) | `0` rows, no error |

The `0` is correct — `tbl_pre_invoice` is still empty. **Verified live after deploy:**
`GET /api/billing/my-queue` returns `200 {"success":true,"data":[]}` as `dev-207`.

### Deployed

Cloud Build `6bc9c437-8c64-4f97-bdd6-bc1cbafe536e` — SUCCESS in 5m36s → image
`dwip-enterprise:2b0c34c` → revision **`dwip-enterprise-00241-wxf`**, latest-ready, 100% of traffic.

### Found alongside it, not fixed here

`GET /api/billing/pending-red-alerts` also returns 500: `Unknown column 'mgp.mgp_number'`.
`tbl_manual_gate_pass_request` is a **3-column stub** (`mgp_id`, `job_id`, `status`) and **no table in
the schema has an `mgp_number` column at all**. The Manual Gate Pass feature therefore has no schema —
restoring it is a schema change, not a hotfix, and is left as a separate decision.

---

## v1.1.0-rc.9 — the advisor can build a pre-invoice again — **RELEASE**

**Release type:** PRODUCTION

**Found by** continuing the same live journey past the rc.8 fix. rc.8 removed the reason the advisor
could not *see* the stage; rc.9 removes the reason the advisor could not *act* on it.

### What was true when rc.8 landed

The cache fix worked, and every engine gate was clear — confirmed by calling the API as the advisor:

```
GET  /api/billing/ready-from-qc                → 200   lists KA32AA5828 (PRE_INVOICE_READY)
POST /api/billing/pre-invoice/check-readiness/7386 → 200   {"ready":true,"blockers":[]}
```

No `P8_NOT_READY`, no `P8_NO_SERVICE_ITEMS`. The exact `estimated_amount` the advisor had typed was
there. The vehicle was, by every server-side measure, ready to compile.

### What was still wrong

The five routes the advisor's own screen calls were all `authorize("billing", "edit")`:

| Route | |
| --- | --- |
| `POST /api/billing/pre-invoice/compile/:jobId` | compile |
| `POST /api/billing/pre-invoice/review/:preInvoiceId` | SA review |
| `POST /api/billing/pre-invoice/send-to-customer/:preInvoiceId` | send |
| `POST /api/billing/pre-invoice/capture-confirmation/:preInvoiceId` | confirm |
| `POST /api/billing/handoff/:preInvoiceId` | hand off to billing |

`service_advisor` holds `Billing` with **`can_view = 1, can_edit = 0`**. `AuthorizationService.checkPermission`
denies by default, there is no delegation row, and the only row in `user_overrides` belongs to someone
else. So the Compile button could only ever return **403 `AUTHORIZATION_DENIED`** — which is what the
console had been reporting all along.

This is the same shape of defect as migration 029: a route gated on a module the role performing the
work does not hold. The button was unreachable, not broken.

### Why not simply grant `Billing.can_edit = 1`

Because `Billing` edit also gates `crm-invoice` (captures the statutory CRM invoice),
`manual-gate-pass/raise` and `manual-gate-pass/:mgpId/gm-action`. Granting it to `service_advisor` would
let an advisor approve a **Manual Gate Pass** — release a vehicle — which is precisely the authority the
owner restricted on 2026-09-14: *"only `developer` and `gm_service` may issue a gate-out pass without
payment settled."* Widening the module would have quietly undone a rule set the day before. The five
advisor steps are carved out instead.

### The fix

Migration **031** creates module `PRE_INVOICE` (named after the route key `pre_invoice`, following the
026/029 precedent — `findByRoleAndModule` compares `LOWER(module_name)` with no space/underscore
normalisation) and grants it view+edit to `service_advisor`. The five routes above are re-gated onto it.

`billing`, `cashier` and `gm_service` are granted it too, because they hold `Billing.can_edit = 1` today
and so could already call these five routes — omitting them would have silently **removed** a
capability. That is the one place this migration is wider than 029's "single role and no wider" rule,
and it is deliberate: 029 created access that did not exist, this moves access that did.
`admin`/`developer` bypass the lookup and need no row.

Idempotent and additive: the module is created only if absent, a grant is inserted only if absent,
nothing existing is modified or removed. Reversal is deleting the `PRE_INVOICE` rows.

### Found and flagged, not acted on

**Production has no `billing` or `cashier` user account at all.** Roles holding `Billing.can_edit = 1`
are `admin`, `billing`, `cashier` and `gm_service` — but no user is assigned to `billing` or `cashier`.
So once the pre-invoice is handed off, the billing stage has no operator. Creating users is reserved to
the owner (*"never ever create any unknown user in any module"*), so this is reported rather than fixed.

### Deployed

Cloud Build `bba7e7ec-d446-4463-8dd0-34287ebba68b` — **SUCCESS** in 5m50s → image
`dwip-enterprise:d6f2dcd` → revision **`dwip-enterprise-00240-286`**, with `/api/health` reporting
that revision and MySQL connected.

Migration 031 applied on boot — `schema_migrations` now reads `v31 sa_pre_invoice_module`
(`2026-09-15 08:47:45`), module `PRE_INVOICE` exists as id 17, and the grants landed for
`service_advisor`, `billing`, `cashier` and `gm_service`.

### Proof, obtained without mutating anything

Called as `emp029` (`service_advisor`) against a job that does not exist — so the handler fails on
business grounds *after* authorization, and a 403 would have meant the fix did not work:

```
POST /api/billing/pre-invoice/compile/999999
  before rc.9 → 403 AUTHORIZATION_DENIED   (handler never ran)
  after  rc.9 → 404 P8_JOB_NOT_FOUND       (authorization passed, handler ran, nothing written)
```

The real compile for `JC-41368` was deliberately **not** performed. Issuing a pre-invoice is the
operator's paperwork step, and the permission fix is already proven without it.

---

## v1.1.0-rc.8 — a stage change now reaches the screen that displays it — **RELEASE**

**Release type:** PRODUCTION

**Found by** driving one real vehicle (`JC-41368` / `KA32AA5828`) from QC into pre-invoice. The
defect is not in the workflow — the workflow was correct and the database agreed — it is that the
UI could not see any of it.

### What the operator saw

The Service Advisor clicked **Acknowledge QC Pass**. Nothing happened: no error, no spinner, no
change to the card. Clicking it again did nothing either. The pre-invoice panel stayed hidden and
Billing stayed empty, so from the chair the whole journey had stalled with no explanation.

### What was actually true

`job_card_master.live_status` **had** moved to `PRE_INVOICE_READY`, timed to the second of the
click. The write was right; the read was wrong.

`GET /api/job-cards` does not read MySQL. It returns `db.jobCards`, an in-memory snapshot built
once by `syncLoad()` at server boot. Engine code writes `job_card_master` directly, so a transition
lands in the database while the API keeps serving the boot-time values — until the server restarts.

`refreshCachedJobCard()` already existed for exactly this, and
`src/core/jobcard-cache-bridge.ts` documents the hazard in its own header — *"the write succeeds,
the supervisor sees success, and the technician's workspace keeps returning the pre-allocation
snapshot"*. But it had **one** caller: the floor allocation bridge. Only allocation ever reached
the screen. Every QC and billing transition did not.

### The fix

The bridge is now exposed as `syncCachedJobCard()` and called after **every committed**
`job_card_master.live_status` write — 18 call sites across three engines:

| Engine | Sites |
| --- | --- |
| `qc-execution-engine.ts` | `QC_IN_PROGRESS`, `QC_PASSED`/`QC_FAILED_REWORK`, `QC_PENDING` (rework), `PRE_INVOICE_READY` |
| `floor-execution-engine.ts` | `FLOOR_ALLOCATED` (allocation), `QC_PENDING` (QC handoff) |
| `billing-engine.ts` | `SA_PRE_INVOICE_REVIEW` ×2, `PRE_INVOICE_SENT`, `CUSTOMER_CONFIRMED`, `BILLING_PENDING`, `BILLING_IN_PROGRESS` ×3, `MANUAL_GATE_PASS_PENDING_GM`, `MANUAL_GATE_PASS_APPROVED`, `BILLING_COMPLETED` ×2 |

Two properties are deliberate, and both are load-bearing:

- **Called after `conn.commit()`, never inside the transaction.** Patching before the commit would
  let a rollback leave the cache advertising a stage the database never took — the same class of lie
  this change removes, just pointing the other way.
- **Never throws, and no-ops when no cache is registered.** A cache problem must not fail a
  transition that has already committed, and unit tests, CLI scripts and migrations (which never
  register a cache) are unaffected.

The floor allocation site was switched onto the shared helper, so the file has one pattern rather
than a dynamic import sitting next to a static one.

### Verification

Type gate clean for the four touched files (the 9 known pre-existing errors in `EmployeeDirectory`,
`engines/vehicle-passport` and `lib/auth.ts` are untouched). `lint:fabrication` PASS over 885 files.
Component tests 4 files / 38 tests PASS.

The DB-backed legacy suites could **not** be run: `role_ops_phase7_qc` and `role_ops_phase8_billing`
report `ECONNREFUSED 127.0.0.1:3307` because the local test MySQL is not running. Those 15 legacy
failures are environmental and are not regressions. The helper cannot mask a real failure either
way, since `registerJobCardCache()` is called only by `server.ts`.
### Deployed

Cloud Build `ea3f3885-5510-4558-be67-721008dd938d` — **SUCCESS** in 5m49s → image
`dwip-enterprise:95dd946` → revision **`dwip-enterprise-00239-hjw`**, latest-ready and serving 100%
of traffic. `/api/health` reports `cloudRunRevision: dwip-enterprise-00239-hjw` with MySQL
connected, and the revision carries all **16** env vars (image-only deploy; nothing was dropped).

The served bundle is **unchanged** at `/assets/index-D03uZ4w-.js`. That is the expected result, not
a stale deploy: rc.8 touches no frontend source, so the hash *should* be identical. The revision
name is the proof of the new build.

Because the new revision rebuilds the in-memory job-card cache from MySQL at boot, `JC-41368`
should already surface in the SA's MY ATTENTION queue as `PRE_INVOICE_READY` / **Send Pre-Invoice**,
with no second acknowledgement. Operator confirmation of that is still outstanding.
---

## v1.1.0-rc.7 — the allocated bay now reaches the job card, and the technician timer starts — **RELEASE**

**Release type:** PRODUCTION

**Found by** driving one real gate-in → gate-out on production (`KA32AA5828` / `JC-41368`) end
to end and watching what each screen did. Every defect below was observed live and confirmed
against the database, not inferred.

### 1. The floor allocation modal offered values that do not exist

`FloorSupervisorWorkspace` initialised its selects to the literals `"B-01"` and `"TECH-001"`.
Neither is a real id: `tbl_bays.bay_id` is `B01`…`B09`/`I1`…`I7`, and the technician options are
built as `TECH-${employee_id}`. A controlled `<select>` whose value matches no `<option>` renders
with **nothing selected**, so the technician box was silently blank and CONFIRM posted
`technicianId: "TECH-001"` with an empty `technicianName`. The bay list escaped the same fate only
because a later effect overwrites it with the first AVAILABLE bay once the roster loads.

Now: both default to `""`, a real (first non-busy) technician is chosen when the roster arrives,
placeholder options explain the empty state, and CONFIRM refuses an incomplete selection instead of
posting a phantom id.

### 2. The allocated bay never reached the job card

`allocateJobAndBay()` wrote the bay as a **string** (`"B09"`) into `tbl_job_allocations` /
`tbl_repair_executions` / `tbl_bays`, and deliberately did **not** write
`job_card_master.bay_id` — the comment reasoned that the column is `int unsigned` and a string
write would coerce to `0`. The coercion concern is real; the conclusion was wrong. `bays` carries a
**`bay_code`** column holding exactly those strings (`bay_code 'B09' -> bay_id 9`), so the correct
integer was always one lookup away.

Leaving it NULL was not neutral: `TechnicianWorkspace` printed "Bay: Not yet allocated" for a
vehicle physically sitting in a bay, which is what the technician saw after a successful allocation.

Now the bridge resolves `bay_code` and writes the int in the same single UPDATE as `live_status`
and `assigned_to`. The allocation ledger remains authoritative; this is its projection onto the
app-wide record.

### 3. The technician's Start button never reached the server

`handleStartTimer` was a bare client-side `setInterval` with no request at all. The engine route
that starts the repair (`POST /api/floor-execution/timer/start`) existed and was tested, but **no
component ever called it** — so the `tbl_repair_executions` row created at allocation stayed
`NOT_STARTED` forever and **no repair time was ever recorded against any job**, which is exactly
the condition the engine's own comment warns about.

Now it POSTs the start, runs the local timer only once the server accepts, and surfaces the
server's reason on refusal. The component reads its work item from `/api/floor-execution/tech-work`,
which is also where the bay is shown from.

### 4. Technicians were identified by the wrong id (this blocked #3)

`authenticateJwt` sets `id` = the **login** id (70) and `employee_id` = 31, but the technician
routes passed `user.id` while `tbl_repair_executions.technician_id` stores `TECH-<employee_id>`
(`TECH-31`). Two consequences, both silent: `/tech-work` filtered on `'70'` and always returned an
empty queue, and `startRepairTimer`'s accept gate compared `'TECH-31'` with `'70'` and could only
answer `NOT_YOUR_JOB` — to the very technician the job was allocated to.

Fixed with a `requireTechnicianRef()` helper used by `tech-work` and timer start/pause/resume.

### 5. `getTechnicianWork` now returns the VRN

The floor lane keys a work item on the SA-intake reference (`DWIP-TEMP-…`), which matches no job
card number, so a caller could not join a work item back to the vehicle the app displays. The VRN
is read from `tbl_gate_entry.vin` via `tbl_sa_intake.gate_entry_id` — **`tbl_sa_intake.vrn` itself
is NULL on every real row**, so joining on the obvious column would have returned nothing. Without
this, a technician holding two open jobs (this one did: `B06` and `B09`) could be shown the wrong
bay.

### Deliberately NOT changed

- The allocation ledger is still keyed on the `DWIP-TEMP-…` intake reference rather than the job
  card number. Reconciling that changes how intake rows are keyed, so it needs an explicit decision.
- The technician's STOP posts the QC handoff but does not complete the `tbl_repair_executions` row,
  which therefore stays `IN_PROGRESS`.

### Verification

Type gate clean for all four changed files (9 pre-existing errors remain in other files);
`lint:fabrication` pass (885 files); component tests 38/38; unit tests 221/228 with the same 7
pre-existing failures.

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
