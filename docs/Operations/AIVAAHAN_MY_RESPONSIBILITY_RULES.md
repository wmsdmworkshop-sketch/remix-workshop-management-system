# AIVAAHAN "MY RESPONSIBILITY" — Relevance Rules & Build Plan

**Status:** DRAFT for approval · **Scope:** Job-card access is relevance-based —
every staff member sees / edits / acts only on job cards they own, are tied to,
or are currently responsible for. Managers supervise everything.

---

## 1. What a job card actually stores (the raw signals)

Persistent people-links on `job_cards`:
- `created_by` — user_id who logged it (reception / advisor at gate-in)
- `service_advisor` — advisor name (string)
- `technician_name` + `technician_assignments[]` (`technician_id`, `role_type`)

Transient position (who it's "with" right now):
- `status`: Waiting · Active · Completed · Invoiced · Carry Forward · Rework · Cancelled
- `current_workflow_state`: GATE_IN → ESTIMATE_PENDING → PARTS_PENDING → WIP_START/ACTIVE
  → QC_PENDING/QC_FAILED → BILLING_PENDING → CASHIER_PENDING → FINAL_REVIEW → COMPLETED

> Key point: **parts, billing, cashier, QC, security, delivery are NOT stored on the
> job card.** Their relevance is the **stage** the JC is in, not ownership. Scoping by
> owner fields alone would hide all JCs from them and break their workflows.

So relevance = **OWNERSHIP (persistent)** ∪ **STAGE (while it's in your court)**.

---

## 2. Relevance rules per role  ← please confirm / adjust each row

### A. Supervision tiers (LOCKED — view-scope and edit-scope can differ)

**Group 1 — Full control: VIEW all + EDIT all**
`admin`, `developer`, `dealer_principal`, `gm_service`, `workshop_manager`

**Group 2 — Full VIEW, EDIT only owned/relevant JCs & bays**
`floor_supervisor`, `service_manager`, `floor_incharge`

**Group 3 — Full VIEW, EDIT nothing (read-only observer, no actionable privileges)**
`dkam`

> Everyone else (reception, advisor, technician, parts, billing, cashier, QC,
> security) is fully scoped: VIEW + EDIT only their own/relevant JCs. Technicians
> see only their own.

### B. Ownership-scoped (persistent link)
| Role | A JC is "mine" when… |
|---|---|
| `reception` / `receptionist` | `created_by = me` (I logged it). Stage: GATE_IN intake. |
| `service_advisor` / `warranty_advisor` | `service_advisor = my name` **or** `created_by = me`. Stages: GATE_IN, ESTIMATE_PENDING, FINAL_REVIEW. |
| `technician` | `technician_name` contains me **or** `technician_assignments[]` has my `employee_id`. Stages: WIP_START, ACTIVE, Rework. |

### C. Stage-scoped (transient — mine while it sits in my stage)
| Role | A JC is "mine" when its state is… |
|---|---|
| `parts` / `parts_incharge` / `spares_manager` / `tools_incharge` | `PARTS_PENDING` (or `parts_required`) |
| `billing` / `accounts` / `warranty_clerk` | `BILLING_PENDING`, or `Completed` awaiting invoice |
| `cashier` | `CASHIER_PENDING`, or `Invoiced` awaiting payment |
| QC (`qc` workspace) | `QC_PENDING`, `QC_FAILED` |
| `security_agent` / `gate_personnel` | `FINAL_REVIEW` / `COMPLETED` awaiting gate-out |
| `breakdown` | (already scoped by `assigned_advisor_id` — breakdowns, not JCs) |

> **Answered:**
> 1. ✅ Everyone keeps a **read-only history** of JCs they owned/handled after those
>    leave their stage. History = view only, no edit.
> 2. ✅ `floor_supervisor` = **VIEW all, EDIT only owned bays/JCs** (Tier 2).

---

## 3. Enforcement design (server-side, IDOR-proof)

Single source of truth: **`src/core/jobcard-relevance.ts`**
```ts
relevanceForUser(user, jobCard): { canView: boolean; canEdit: boolean }
```
- Full-view roles → `{true, true}` always.
- Others → `canView` if ownership OR stage match; `canEdit` only while it's actively
  in their court (stage) or they own it.

Used in two places:
- **Read scope** — `GET /api/job-cards` filters the array to `canView` rows.
- **Action guard** — every JC mutation returns **403** unless `canEdit` (managers bypass).

Analytics/self endpoints: server **forces `req.user.employee_id`** for non-managers
(ignores any client-supplied `?employeeId=`), closing the IDOR the audit flagged.

---

## 4. Endpoints to change

**Read (Phase 1):**
- `GET /api/job-cards` → relevance filter

**Actions (Phase 2) — add `canEdit` 403 guard:**
- `PUT /api/job-cards/:id`
- `POST /api/job-cards/:id/{status, assign, revenue, start-repair, bill,
  estimate-approval, qc-check, pre-invoice, manager-approve}`

**Personal analytics (Phase 3) — force self:**
- `GET /api/analytics/productivity`, `/kpis`, `/revenue` → default `employee_id = req.user`

---

## 5. Build phases

- **Phase 1 — Read scope.** Central helper + filter the JC list. Low risk; nothing is
  blocked, people just stop seeing others' cards. Managers unaffected.
- **Phase 2 — Action lock.** 403 guards on JC mutations using the same helper.
- **Phase 3 — "My Workspace" tab.** One personal, role-agnostic screen: My Jobs,
  My Pending, My Breaches (SLA), My Performance/Score, My Incentives, My Attendance —
  all self-scoped, backed by the forced-self analytics endpoints.

---

## 6. Risks / guardrails
- Wrong stage rule → a role can't see a JC it needs. Mitigate: Phase 1 is read-only
  scoping first, verify against a day of real ops before Phase 2 locks actions.
- Owner fields are **name strings** (`service_advisor`, `technician_name`) — matching is
  case-insensitive contains; ideally migrate to `employee_id` FKs later.
- Full-view role list must be exact (Section 2A) so supervisors never get locked out.
