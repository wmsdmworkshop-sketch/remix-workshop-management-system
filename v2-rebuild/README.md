# Workshop ERP v2 — specification only (NOT part of DWIP)

This folder holds the specification for **Workshop ERP v2**, a **separate product** from
the DWIP Enterprise system that lives in the rest of this repository.

## Read this before touching anything here

- **This is not DWIP.** The code in `src/`, `server.ts`, `android/` and `deployment/` belongs
  to DWIP Enterprise — a live production system (Cloud Run service `dwip-enterprise`, 671 job
  cards, real traffic). Nothing in this folder changes it.
- **DWIP is governed by [`AGENTS.md`](../AGENTS.md) and [`.agents/AGENTS.md`](../.agents/AGENTS.md)**
  (the EAR-001 constitution). Those bind DWIP. This folder's spec does **not** override them, and
  must never be used to justify a change to live behaviour.
- **`PROJECT_MEMORY.md` here is a specification, not an implementation.** No code in this repository
  implements it. Treat every rule in it as target-state until a separate codebase exists.

## Status

| | |
| --- | --- |
| Owner | Sayeed Jaffer |
| Pilot | Sedam Road |
| Nature | Specification + **domain core only** (see below). No app, no database, no API. |
| Relationship to DWIP | Successor product, not a refactor of DWIP |

## Why it is separated

The spec was originally authored at the repository root as `PROJECT_MEMORY.md`, where it sat
alongside — and in its own §2.1 ranked *above* — the running system's code and tests. That is a
governance hazard: an agent loading it could treat an unbuilt rebuild's rules as more authoritative
than production behaviour that 671 real job cards depend on.

Moving it here, excluding it from the deploy image, and pointing at it from `AGENTS.md` makes the
boundary explicit.

## Known gaps in the spec (recorded 2026-09-19)

- **§4.1/§4.2 split.** The original spec presented 13 proposed statuses as "finalized". Production
  uses a different set entirely (`GATE_OUT` 442, `Waiting` 116, `Unassigned` 85, `Assigned` 10,
  `FLOOR_ALLOCATED` 9, `GATE_ENTRY_DONE` 7, `BILLING_IN_PROGRESS` 1, and one value containing an
  emoji). The spec now carries both, clearly labelled.
- **§2.1 authority.** Corrected so DWIP's constitution and live production constraints outrank this
  spec for anything touching the running system.
- **§5.7 overtime deduction is unimplemented everywhere.** The spec requires an approved OT amount to
  be deducted from a job's labour revenue before the productivity split. The rule exists nowhere in
  DWIP's code — and unlike the vendor deduction, which has no column anywhere, this one is
  *implementable*: `OvertimeRequest` carries `job_card_id` and `calculated_amount`.
- **§13's open items are partly answerable today** — most obviously the production role list.

## What exists now (2026-09-19)

The **domain core** only — pure TypeScript, no stack decision required. Chosen deliberately
because §13 blocks the technology/repository decision, and none of these rules change with it.

| File | What it is |
| --- | --- |
| `src/domain/job-card-status.ts` | §4.2's status model: 11 statuses, 5 sub-statuses, 16 transitions, guards, and role authority — with a `SPEC_4_2_ENTRIES` table so the code can be diffed against the spec by eye |
| `src/domain/job-card-status.test.ts` | 42 tests: traceability, table invariants, reachability, §4.2's additional rules, §5.4 independent gates, and the authority gaps |

Run them:

```
npx vitest run --config v2-rebuild/vitest.config.ts
npx tsc -p v2-rebuild/tsconfig.json --noEmit
```

Isolation is by omission, and is verified: the repo-root `tsconfig.json` includes only `src/**/*`
and `server.ts`, and the repo-root `vitest.config.ts` includes only `src/tests/**`. So both DWIP
gates ignore this folder without needing an `exclude`. `tools/no-fabricated-data.mjs` scans only
`src/` and `server.ts`, which means **v2 has no fabrication guard of its own yet**.

### Two readings the code had to make

Both are flagged rather than buried, per §2.2:

1. **§4.2 numbers 13 entries but calls two of them sub-statuses.** The code takes the annotation at
   its word: 11 top-level statuses, with `estimate-pending-customer` and `waiting-for-parts` as
   sub-statuses. The numbering is treated as list position, not as a claim of equal rank.
2. **The three bullets under entry 4 are not steps.** §5.4 says customer approval, OEM job-card
   raise and floor allocation are *independent gates*, so they are modelled as `concurrent-gate`
   work-items that open on entering `with-sa` — not as transition nodes. A test asserts they have
   no incoming or outgoing transitions, so a future edit cannot quietly turn them into a sequence.

## Open questions raised by the first slice

These are §13 decisions. The code does **not** assume an answer, and six transitions currently
fail closed because of it:

- **Who performs `T01` `gated-in → reception`, `T07`/`T08` the parts wait, `T10` the return from a
  vendor pause, `T14` `pre-invoice → waiting-for-payment`, and `T16` close?** The spec defines
  each of these moves but never names the actor. `canTransition()` returns
  `denied-unspecified-authority` rather than inventing a role.
- **Five more rest on an implied reading**, named in the code as `authorityBasis: 'implied'`:
  `T02`, `T05`, `T06`, `T09`, `T15`. Worth a one-line confirmation each.
- **Does floor allocation really precede customer approval?** §5.4 lists them as independent, and
  the model follows that literally — a job can reach the floor and QC with the estimate still
  pending with the customer. That may be exactly right, or independence may have meant "not
  strictly sequential" rather than "concurrent".
- **QC's driver/owner acknowledgement (§5.9)** — the spec says QC "gets" it, but does not say it
  blocks `qc → pre-invoice`. It is deliberately **not** a guard, so it needs either confirmation or
  a guard key.
- **Is the §4.2 job-card close point settled?** §4.2 closes the card at invoice generation, which
  contradicts production (§4.1: 442 cards sit at `GATE_OUT`). The model implements §4.2's 13th
  entry, and §4.3 tracks the vehicle separately afterwards, so the two machines do not overlap.

## Next step

A genuinely separate repository. This folder is a staging step; it still shares DWIP's git history,
branch and deploy tooling.
