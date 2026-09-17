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
 *  - the multi-vertical layer (mechanical vs electrical -> 50/50 between verticals
 *    first, each vertical then subdivided by the rules above). There is no vertical
 *    on job_technician_maps and no way to classify a technician into one.
 *  - the vendor/outsourced vertical: its payment must be deducted from total labour
 *    revenue BEFORE the 50/50. Nothing can be deducted today — there is no vendor
 *    cost column anywhere in the schema, and job_technician_maps.employee_id has a
 *    FOREIGN KEY to employees, so a non-employee vendor cannot even be recorded.
 *  - the >4 in-house headcount override (equal split WITHIN each vertical).
 *    N>=5 currently splits equally across all technicians flat, which coincides with
 *    the owner rule only when a single vertical is involved.
 *  - mid-job changes (technician added late, or pulled off early by the floor
 *    in-charge): the owner spec has no formula — the floor in-charge decides. No
 *    manual entry point exists for that yet.
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

  // Determine split percentages based on user's exact business logic
  let pcts: number[] = [];
  let roles: string[] = [];

  if (N === 1) {
    pcts = [100];
    roles = ['Primary Technician'];
  } else if (N === 2) {
    // Technician 60 / assistant 40 — owner spec 2026-09-17. Was 50/50.
    pcts = [60, 40];
    roles = ['Lead Technician', 'Assistant Technician'];
  } else if (N === 3) {
    pcts = [40, 30, 30];
    roles = ['Senior Lead', 'Co-Technician', 'Co-Technician'];
  } else if (N === 4) {
    pcts = [25, 25, 25, 25];
    roles = ['Co-Technician', 'Co-Technician', 'Co-Technician', 'Co-Technician'];
  } else {
    // N >= 5: Equal share
    const equalShare = 100 / N;
    pcts = Array(N).fill(equalShare);
    roles = sortedTechs.map(() => 'Co-Technician');
  }

  // Allocate split amounts
  for (let i = 0; i < N; i++) {
    const tech = sortedTechs[i];
    const pct = pcts[i];
    const roleLabel = roles[i];
    
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
