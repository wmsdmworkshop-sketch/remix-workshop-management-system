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
| Nature | Specification / design only — **zero implementation** |
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

## Next step

A genuinely separate repository. This folder is a staging step; it still shares DWIP's git history,
branch and deploy tooling.
