# Release Record — P1: Job Card Truthfulness

**Status:** P1 acceptance CLOSED. **NOT DEPLOYED.**
**Packet:** P1 (defects D-1…D-7) of the Job Card decision packet.
**Scope:** presentation only — no API, schema, permission or workflow change.
**P2–P6 unchanged** and still blocked on DEC-1…DEC-6.

---

## Commit identifier

**Head of P1: `7336ce2`**

Full set, in order from the baseline `32d270c`:

| Commit | Subject |
|---|---|
| `ee5d4db` | fix(job-card): P1 truthfulness — stop presenting invented data as fact |
| `4c49df0` | fix(dashboard): P1/D-5 — no-op fallback must not report success |
| `ad3cfa3` | test(p1): component-level acceptance harness and specs |
| **`7336ce2`** | **fix(job-card): P1/D-5 — handle rejected callbacks without claiming persistence** |

Baseline for all comparisons: `32d270c`.

---

## Release notes

**What changed for users of the Job Card screen**

- **Invented vehicle facts removed.** Warranty terms, field service bulletin
  numbers and recall campaigns were previously chosen by whether the model name
  contained "ev", and fabricated people ("Arnaud Kumar", "Sanjay Patel") and a
  bay were shown as recommendations. Absent facts now read **"Not recorded"**.
- **AI confidence no longer invented.** The "96%" figure was a string literal;
  the "Gemma-4" explanation rendered even when no analysis had run. Both now
  appear only when the response actually carries them.
- **Money fields no longer pre-filled.** Seeds of ₹3500/₹1200, ₹3000/₹1000 and
  ₹1500/₹500 are gone. Fields open empty, a blank field is refused rather than
  submitted as zero, and an untouched field cannot overwrite a stored amount.
  An explicit `0` remains valid and distinguishable from blank.
- **Mislabelled split total withheld.** The "Total Split Share" row displayed the
  labour invoice amount, not a sum, and threw on a null value. It is withheld
  rather than relabelled — its financial meaning is unresolved pending DEC-1.
- **Success messages now follow the actual result.** Both the allocation and
  revenue actions previously announced success before the request returned. A
  returned failure, a rejected call, or an unconfirmed outcome now reports
  *"Could not confirm … Refresh the job details before retrying."* — deliberately
  **not** "nothing was saved", since a thrown call does not establish whether the
  write reached the server. Raw exception text is never shown.
- **A failed load no longer looks like an empty workshop.** Distinct loading,
  empty, filtered-empty and error states, with a retry. A failed complaint-history
  fetch no longer asserts "The current complaint is Version 1".
- **Uncomputable values read as "—".** Elapsed time no longer shows the literal
  "Active"; waiting days no longer shows a fabricated `0`. A genuine same-day job
  still shows "0 days".

**Developer-facing**

- New component test harness: `vitest.components.config.ts` +
  `src/tests/components/`, run with `npm run test:components`. Dev dependencies
  only (`@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`, `jsdom`); no runtime dependency added, no
  unrelated package upgraded.
- Callback contract tightened: `onAssignTechnicians` / `onCalculateRevenue`
  signal success **only** by resolving `true`. Verified before narrowing that
  every call site already returns an explicit boolean.

---

## Final verification results

Measured at `7336ce2`, working tree clean.

| Check | Result | Baseline |
|---|---|---|
| **Component acceptance suite** | **38 passed / 0 failed / 0 unhandled errors** | new |
| **Typecheck** (`npx tsc --noEmit`) | **9 errors**, none in a changed file | 9 at `32d270c` — unchanged |
| **Build** (`npm run build`) | **Succeeds** | — |
| **Existing node suite** (`npm run test:unit`) | **166 passed / 9 failed** | 166/9 — **unchanged** |
| Fabricated strings in built client bundle | **0** | — |

**The 9 node-suite failures are pre-existing** `Table 'wms_test.job_card_master'
doesn't exist` fixture gaps. They are unrelated to P1, were deliberately not
repaired, and are recorded here rather than hidden — that suite is **not** a
clean pass.

**Component coverage:** D-1 missing facts and 11 previously fabricated strings ·
D-2 suppressed confidence and explanation · D-3 blank/single-blank/zero/untouched
amounts · D-4 absent split total · D-5 confirmed success, returned failure,
rejected callback and missing callback across both the assignment and revenue
paths · D-6 error vs empty vs filtered-empty, retry and successful retry, history
failure · D-7 em dash vs genuine zero · plus GateProgressBar rendered standalone
and in both JobCardManager surfaces.

**Test isolation:** components under test import no `db/`, `server`, `mysql2` or
`/core/` module; `fetch` is stubbed to throw on any unmocked call. No server
start, no boot-time revenue recomputation, no scheduler, no production access.

---

## Deployment procedure *(documented; NOT executed)*

From `deployment/DEPLOY_DWIP_ENTERPRISE.md`.

```
gcloud builds submit --config deployment/cloudbuild.yaml \
  --substitutions=_TAG=$(git rev-parse --short HEAD) \
  --project giga-course-dp497
```

Verify:

```
gcloud run services describe dwip-enterprise --region asia-south1 \
  --project giga-course-dp497 \
  --format="value(status.latestReadyRevisionName, status.traffic[0].revisionName)"

curl -fsS https://dwip-enterprise-npoyvb3q7a-el.a.run.app/api/health   # expect {"status":"UP"}
```

Then smoke-test login on https://devanand.aivaahan.com.

## Rollback procedure *(documented; NOT executed)*

Traffic-shift to the known-good revision — instant, no rebuild:

```
gcloud run services update-traffic dwip-enterprise --region asia-south1 \
  --project giga-course-dp497 \
  --to-revisions dwip-enterprise-00200-sh4=100
```

**`dwip-enterprise-00200-sh4` is the revision currently serving 100% of traffic**
(confirmed by `services describe` at the time of writing). It is therefore the
correct rollback target for a P1 deploy. The example revision in the deployment
doc (`dwip-enterprise-00056-9tj`) is stale and must not be used.

---

## Missing prerequisites — identified, NOT executed

| # | Prerequisite | State |
|---|---|---|
| **1** | **Deployment approval.** No deploy is authorized by the P1 acceptance approval. | **Outstanding** |
| **2** | **`version.json` is stale.** It records `v1.1.0-rc.1`, build 124, `buildTime` 2026-08-30, `"commit": "HEAD"` — it does not identify a commit and predates P1. AGENTS.md §2 requires it updated on every release. **Not updated here**, since that is a release action rather than part of P1 acceptance. | **Outstanding** |
| **3** | **No CHANGELOG exists.** AGENTS.md §2 cites `docs/CHANGELOG.md`; the whole `docs/` tree was quarantined in commit `8b753fe`, so the referenced file is absent. This record stands in its place. | **Outstanding** |
| **4** | **Rule 9 local verification.** Typecheck, build and both suites have been run and are recorded above. The rule's literal path (`npx tsx scripts/test_*.ts`) does not exist in this repo. | **Satisfied in substance** |
| **5** | **No UI verification against a running application.** P1 is verified by component tests, typecheck, build and bundle inspection — not by exercising the deployed app. | **Accepted limitation** |

**Nothing in this list has been executed.**
