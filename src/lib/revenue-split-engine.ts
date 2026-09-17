export interface TechnicianInput {
  employee_id: number;
  full_name: string;
  role: string;
  employee_grade?: 'Junior' | 'Senior' | string;
  basic_salary?: number;
}

export interface AllocationResult {
  employee_id: number;
  full_name: string;
  role: string;
  allocated_role: string;
  split_pct: number;
  split_amount: number;
}

/**
 * Classifies a raw database role string into one of the standard categories.
 */
export function classifyRole(roleStr: string): string {
  const r = (roleStr || "").toLowerCase();
  if (r.includes("mechanic") || r.includes("mech") || r.includes("alignment") || r.includes("denter") || r.includes("welder") || r.includes("painter")) {
    return 'Mechanic';
  }
  if (r.includes("technician") || r.includes("tech")) {
    return 'Technician';
  }
  if (r.includes("electrician") || r.includes("elec")) {
    return 'Electrician';
  }
  return 'Additional Tech';
}

/**
 * Computes a seniority score for sorting technicians.
 * Uses salary to resolve grade hierarchy if roles are ambiguous.
 */
export function getSeniorityScore(tech: TechnicianInput): number {
  const role = (tech.role || "").toLowerCase();
  const grade = (tech.employee_grade || "").toLowerCase();
  const salary = Number(tech.basic_salary || 0);
  
  let score = 0;
  
  // Salary points (higher salary = more senior)
  score += Math.floor(salary / 10);
  
  // Grade bonus
  if (grade === "senior" || grade === "head" || grade === "specialist") {
    score += 1000;
  }
  
  // Role based points
  if (role.includes("sr.") || role.includes("senior") || role.includes("head") || role.includes("specialist")) {
    score += 2000;
  } else if (role.includes("floor") || role.includes("supervisor")) {
    score += 1500;
  }
  
  if (role.includes("mechanic") || role.includes("alignment") || role.includes("denter") || role.includes("welder")) {
    score += 800;
  } else if (role.includes("technician") || role.includes("electrician") || role.includes("elecrician")) {
    score += 600;
  } else if (role.includes("helper") || role.includes("trainee") || role.includes("junior")) {
    score += 200;
  } else {
    score += 100;
  }
  
  return score;
}

/**
 * The two IN-HOUSE pay verticals.
 *
 * Owner ruling, 2026-09-17, verbatim: "technicians are all mechanics but
 * electricians are different". So the split is binary and there is no
 * 'Mechanic' role to look for — production has no employee with that role at
 * all (21 Technician, 7 Electrician, 2 Wheel Alignment, 2 Mechanical Helper).
 *
 * The test is on 'elec' rather than 'electrician' deliberately: one production
 * record carries the misspelling "Jr. elecrician", which a longer substring
 * would miss.
 *
 * A third vertical — outsourced/vendor — is specified but cannot exist yet: see
 * the note in calculateRevenueAllocation. Vendors are NOT silently folded into
 * MECHANICS here; they simply cannot be represented.
 */
export type PayVertical = 'MECHANICS' | 'ELECTRICAL';

export function verticalOfRole(roleStr: string): PayVertical {
  const r = (roleStr || '').toLowerCase();
  if (r.includes('elec')) return 'ELECTRICAL';
  return 'MECHANICS';
}

/** The taper ladder WITHIN one vertical (percentages sum to 100). */
function taperFor(n: number): { pcts: number[]; roles: string[] } {
  if (n === 1) return { pcts: [100], roles: ['Primary Technician'] };
  if (n === 2) return { pcts: [60, 40], roles: ['Lead Technician', 'Assistant Technician'] };
  if (n === 3) return { pcts: [40, 30, 30], roles: ['Senior Lead', 'Co-Technician', 'Co-Technician'] };
  if (n === 4) {
    return {
      pcts: [25, 25, 25, 25],
      roles: ['Co-Technician', 'Co-Technician', 'Co-Technician', 'Co-Technician'],
    };
  }
  const equalShare = 100 / n;
  return { pcts: Array(n).fill(equalShare), roles: Array(n).fill('Co-Technician') };
}

/** The >4-headcount override: no taper, everyone in the vertical gets the same. */
function equalFor(n: number): { pcts: number[]; roles: string[] } {
  const equalShare = 100 / n;
  return { pcts: Array(n).fill(equalShare), roles: Array(n).fill('Co-Technician') };
}

/**
 * Calculates the revenue allocation splits for a job based on the technicians assigned.
 *
 * Owner spec (2026-09-17). In-house rules implemented here:
 *   N=1 -> 100%
 *   N=2 -> 60 / 40   (technician takes 60, assistant 40)
 *   N=3 -> 40 / 30 / 30
 *   N=4 -> 25 each
 *   N>=5 -> equal shares
 *
 * WHO GETS THE LARGER SHARE is decided by getSeniorityScore(), i.e. by salary /
 * grade / role keywords. The owner spec instead assigns the big share by ROLE
 * (technician vs ASSISTANT technician), so a low-paid lead paired with a
 * better-paid assistant is currently credited backwards. Left as-is here because
 * fixing it needs the vertical mapping the owner is still specifying.
 *
 * NOT YET IMPLEMENTED (do not assume otherwise):
 *  - the vendor/outsourced vertical. Its payment must be deducted from total labour
 *    revenue BEFORE the 50/50. Nothing can be deducted today: there is no vendor
 *    cost column anywhere in the schema, and job_technician_maps.employee_id has a
 *    FOREIGN KEY to employees, so a non-employee vendor cannot even be recorded on
 *    a job. When a vendor model exists it slots in ahead of the vertical split, not
 *    inside it.
 *  - mid-job changes (technician added late, or pulled off early by the floor
 *    in-charge): the owner spec has no formula — the floor in-charge decides. No
 *    manual entry point exists for that yet.
 *
 * IMPLEMENTED 2026-09-17 — the multi-vertical layer. Owner ruling: technicians are
 * all mechanics, electricians are different. When ONLY ONE vertical is on the job
 * the ladder above is applied unchanged, so an all-mechanic job is unaffected. When
 * BOTH verticals are present the labour splits 50/50 between them and each vertical
 * then subdivides internally by the same ladder — or equally, if the TOTAL in-house
 * headcount across both verticals exceeds 4, which is the owner's override.
 *
 * Worth the owner's eye: with 3 mechanics and 1 electrician, the ladder gives the
 * single electrician 50% of the labour and each mechanic ~16.7%. That is what the
 * spec says, and it is implemented as specified rather than quietly softened — but
 * it is a large swing, so flag it if the intent was headcount-weighted verticals.
 *
 * DATA DISCONTINUITY: revenue rows already persisted were computed with the old
 * 50/50 rule and are deliberately never rewritten (the backfill treats existing
 * revenue as authoritative — see the W-6 restart-duplication note in server.ts).
 * So historic rows keep 50/50 and only newly-calculated ones use 60/40.
 */
export function calculateRevenueAllocation(
  jobId: number,
  technicians: TechnicianInput[],
  totalRevenue: number
): AllocationResult[] {
  if (!technicians || technicians.length === 0 || totalRevenue <= 0) {
    return [];
  }

  // Sort technicians by seniority (most senior first, resolved by salary if needed)
  const sortedTechs = [...technicians].sort((a, b) => {
    return getSeniorityScore(b) - getSeniorityScore(a);
  });

  const N = sortedTechs.length;
  const results: AllocationResult[] = [];

  // --- vertical layer ------------------------------------------------------
  // One vertical present (an all-mechanic job, the common case): ladder as before.
  // Both present: 50/50 between the verticals, then subdivide inside each.
  const mechanics = sortedTechs.filter((t) => verticalOfRole(t.role) === 'MECHANICS');
  const electrical = sortedTechs.filter((t) => verticalOfRole(t.role) === 'ELECTRICAL');
  const isMixedVertical = mechanics.length > 0 && electrical.length > 0;

  // keyed by the TechnicianInput object identity, which filter() preserves.
  const assignment = new Map<TechnicianInput, { pct: number; roleLabel: string }>();

  if (!isMixedVertical) {
    const { pcts, roles } = taperFor(N);
    sortedTechs.forEach((t, i) => assignment.set(t, { pct: pcts[i], roleLabel: roles[i] }));
  } else {
    // >4 in-house heads in TOTAL: the taper stops applying and each vertical
    // divides its own share equally among its own people.
    const useEqualShares = N > 4;
    for (const group of [mechanics, electrical]) {
      const { pcts, roles } = useEqualShares ? equalFor(group.length) : taperFor(group.length);
      group.forEach((t, i) => {
        // pcts[i] is a share of THIS vertical; halve it to get the share of the job.
        assignment.set(t, { pct: pcts[i] / 2, roleLabel: roles[i] });
      });
    }
  }

  // Allocate split amounts. Iterate sortedTechs, NOT the vertical groups, so the
  // output stays in seniority order exactly as it was before the vertical layer —
  // callers zip this array against their own input, and re-ordering it to put
  // mechanics first would silently reattribute names to amounts in their UI.
  for (const tech of sortedTechs) {
    const { pct, roleLabel } = assignment.get(tech)!;
    
    // Round percentages to 2 decimal places for display
    const splitPctRounded = Math.round(pct * 100) / 100;
    
    // Calculate split amount
    const splitAmount = Math.round(totalRevenue * (pct / 100));
    
    results.push({
      employee_id: tech.employee_id,
      full_name: tech.full_name,
      role: tech.role,
      allocated_role: roleLabel,
      split_pct: splitPctRounded,
      split_amount: splitAmount
    });
  }

  // Ensure total allocated matches totalRevenue perfectly (no rounding loss)
  const sumOfAmounts = results.reduce((sum, r) => sum + r.split_amount, 0);
  if (sumOfAmounts !== totalRevenue && results.length > 0) {
    const diff = totalRevenue - sumOfAmounts;
    results[results.length - 1].split_amount += diff;
  }

  return results;
}
