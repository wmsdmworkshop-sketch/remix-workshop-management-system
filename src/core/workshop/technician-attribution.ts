/**
 * Technician attribution — who gets paid for a job.
 *
 * WHY THIS EXISTS
 * ---------------
 * The labour-split engine reads `job_technician_maps`. Measured on production
 * 2026-09-18, that table holds **1 row**, while the workshop has completed 577
 * jobs and recorded a technician on 537 of them — in `job_card_master.assigned_to`.
 *
 * "Who worked on this job" is recorded in SIX places, and the engine was reading
 * the only empty one:
 *
 *   job_card_master.assigned_to   537 rows   <- the data actually lives here
 *   tbl_repair_executions          12 rows   TECH-<n> text, no multi-tech rows
 *   tbl_job_allocations            17 rows   only ~4 resolve to a job card
 *   job_technician_maps             1 row    <- what calculateRevenueAllocation reads
 *   tech_slot_1..5                  0        dead columns, no code reads them
 *   job_card_technician             0        unused
 *
 * `tbl_job_allocations` was the documented authority ("The allocation ledger
 * remains authoritative; this is its projection onto the job card" —
 * docs/CHANGELOG.md), but that describes intent. Measured, it is unusable as a
 * source: 10 of its 17 rows carry `DWIP-TEMP-SEDAM-*` ids that match neither
 * `vehicle_reg` nor `job_card_no`, and `KA32AA5577` appears four times naming
 * `TECH-5` while the job card itself says `assigned_to=17`. Wiring it would have
 * paid one technician three times for a single job. Hence `assigned_to`.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------
 * It does not invent a person. If an id cannot be resolved against the roster it
 * is reported in `unresolved` and NO allocation is produced for that job — money
 * is never attached to a placeholder identity. The code this replaced emitted a
 * literal `full_name: "Unknown"` and divided the labour against it, which
 * EAR-001 forbids.
 *
 * It also does not enable multi-technician jobs. `assigned_to` is a single
 * scalar, and no job in the database has ever had two technicians recorded
 * anywhere. The 60/40 and the 50/50 vertical rules remain unreachable until
 * multi-technician allocation has a home.
 */

import type { TechnicianInput } from '../../lib/revenue-split-engine';

export type AttributionSource = 'tech_map' | 'assigned_to' | 'none';

export interface AttributionEmployee {
  employee_id: number;
  full_name: string;
  role: string;
  employee_grade?: string | null;
  basic_salary?: number | null;
}

export interface AttributionMapRow {
  employee_id: number;
  tech_role?: string | null;
}

export interface AttributionResult {
  /** Ready to hand straight to calculateRevenueAllocation. */
  technicians: TechnicianInput[];
  /** Where the answer came from — so callers can log provenance. */
  source: AttributionSource;
  /** Ids that matched no employee. Non-empty means the caller must NOT allocate. */
  unresolved: number[];
}

const toTechnician = (emp: AttributionEmployee): TechnicianInput => ({
  employee_id: Number(emp.employee_id),
  full_name: emp.full_name,
  role: emp.role,
  employee_grade: emp.employee_grade ?? undefined,
  basic_salary: emp.basic_salary ?? undefined,
});

/**
 * Resolves the technicians to split a job's labour between.
 *
 * Order of precedence:
 *   1. An explicit allocation row (`job_technician_maps`) — this is the record of
 *      who was actually assigned, so it wins whenever it exists. Today it almost
 *      never does.
 *   2. `assigned_to` from the job card — the column the floor allocation actually
 *      writes, and the one the technician's own screen reads.
 *   3. Nothing. The caller must surface an honest empty state, not a placeholder.
 *
 * FAILS CLOSED: any id that cannot be resolved aborts the whole attribution and is
 * reported, because guessing would divide someone's wages by a person who does not
 * exist, and that is worse than refusing.
 */
export function resolveJobTechnicians(params: {
  maps?: AttributionMapRow[] | null;
  assignedTo?: number | string | null;
  employees?: AttributionEmployee[] | null;
}): AttributionResult {
  const maps = params.maps ?? [];
  const employees = params.employees ?? [];
  const assignedTo = params.assignedTo;

  const byId = new Map<number, AttributionEmployee>();
  for (const e of employees) byId.set(Number(e.employee_id), e);

  // 1. Explicit allocation rows.
  if (maps.length > 0) {
    const unresolved: number[] = [];
    const technicians: TechnicianInput[] = [];
    for (const m of maps) {
      const id = Number(m.employee_id);
      const emp = byId.get(id);
      if (!emp) {
        unresolved.push(id);
        continue;
      }
      technicians.push(toTechnician(emp));
    }
    if (unresolved.length > 0) {
      // Nothing is returned at all — a partially-resolved team would silently
      // redistribute the missing person's share among the rest.
      return { technicians: [], source: 'none', unresolved };
    }
    return { technicians, source: 'tech_map', unresolved: [] };
  }

  // 2. The job card's own allocation column.
  if (assignedTo !== null && assignedTo !== undefined && String(assignedTo).trim() !== '') {
    const id = Number(assignedTo);
    if (!Number.isFinite(id)) {
      return { technicians: [], source: 'none', unresolved: [] };
    }
    const emp = byId.get(id);
    if (!emp) {
      return { technicians: [], source: 'none', unresolved: [id] };
    }
    return { technicians: [toTechnician(emp)], source: 'assigned_to', unresolved: [] };
  }

  // 3. Genuinely nobody recorded.
  return { technicians: [], source: 'none', unresolved: [] };
}

export interface NamedMatchResult {
  /** Names that matched exactly one employee, in the order given. */
  resolved: Array<{ name: string; employee_id: number; full_name: string }>;
  /** Names that matched nobody on the roster. */
  unmatched: string[];
  /** Names that matched more than one employee — deliberately NOT guessed at. */
  ambiguous: string[];
}

const norm = (s: string) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Matches invoice technician NAMES to employees.
 *
 * The OCR already extracts `assigned_technicians` as a name list from the invoice
 * (`ocr-fallback.service.ts` asks the model for exactly that). Names are the only
 * route to a TWO-technician job, because `job_card_master.assigned_to` is a single
 * scalar — so without this, the 60/40 and the mechanic/electrician 50/50 rules can
 * never apply to anything.
 *
 * Matching is deliberately conservative:
 *   - exact full-name match wins outright;
 *   - otherwise a substring match is accepted ONLY if exactly one employee matches;
 *   - anything else is reported, never guessed at. Two technicians sharing or
 *     sub-stringing a name is a real hazard here — `jobcard-relevance.ts` warns
 *     about the same thing for `assigned_to`.
 *
 * Callers must treat a non-empty `unmatched`/`ambiguous` as "cannot use the
 * invoice list" and fall back, rather than allocating to a partial team.
 */
export function matchTechniciansByName(
  names: string[],
  employees: AttributionEmployee[]
): NamedMatchResult {
  const resolved: NamedMatchResult['resolved'] = [];
  const unmatched: string[] = [];
  const ambiguous: string[] = [];

  for (const raw of names || []) {
    const n = norm(raw);
    if (!n) continue;

    const exact = employees.filter((e) => norm(e.full_name) === n);
    if (exact.length === 1) {
      resolved.push({ name: raw, employee_id: Number(exact[0].employee_id), full_name: exact[0].full_name });
      continue;
    }
    if (exact.length > 1) {
      ambiguous.push(raw);
      continue;
    }

    const partial = employees.filter((e) => {
      const full = norm(e.full_name);
      return full.includes(n) || n.includes(full);
    });
    if (partial.length === 1) {
      resolved.push({ name: raw, employee_id: Number(partial[0].employee_id), full_name: partial[0].full_name });
    } else if (partial.length > 1) {
      ambiguous.push(raw);
    } else {
      unmatched.push(raw);
    }
  }

  return { resolved, unmatched, ambiguous };
}
