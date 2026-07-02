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
 * Uses the exact rules specified by the user:
 * Scenario 1 (N=1): 100% allocation
 * Scenario 2 (N=2): 50% / 50% split
 * Scenario 3 (N=3): 40% for the highest senior (grade/salary), 30% and 30% for others
 * Scenario 4 (N=4): 25% each
 * Scenario 5 (N>=5): Divided equally
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
    pcts = [50, 50];
    roles = ['Co-Technician', 'Co-Technician'];
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
