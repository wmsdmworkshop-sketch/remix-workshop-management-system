/**
 * WOS Core Architecture: Employee Eligibility Service
 * Bounded Context: Core System / Workforce Management
 * Description: Canonical source of truth for workforce eligibility checks across all workshop contexts.
 *              Eliminates legacy string-matching role heuristics.
 */

export interface EmployeeEligibilityProfile {
  employee_id: number;
  full_name: string;
  role: string;
  is_active: boolean | number;
  is_workshop_employee?: boolean | number;
  is_technician_eligible?: boolean | number;
  is_labour_revenue_eligible?: boolean | number;
  is_bay_assignable?: boolean | number;
  is_breakdown_eligible?: boolean | number;
  is_qc_eligible?: boolean | number;
  is_warranty_eligible?: boolean | number;
}

export class EmployeeEligibilityService {
  /**
   * Evaluates whether an employee is eligible for technician assignment.
   */
  public static canAssignTechnician(emp: EmployeeEligibilityProfile): boolean {
    if (!emp || emp.is_active === false || emp.is_active === 0) return false;

    // Explicit DB flag priority
    if (typeof emp.is_technician_eligible === 'boolean' || typeof emp.is_technician_eligible === 'number') {
      return Boolean(emp.is_technician_eligible);
    }

    // Default canonical role fallback (strict non-tech exclusion)
    const roleLower = (emp.role || "").toLowerCase();
    const nonTechExclusions = [
      "driver", "bd assistant", "security", "hr", "accounts", "admin", 
      "store", "reception", "housekeeping", "cashier", "biller"
    ];
    if (nonTechExclusions.some(ex => roleLower.includes(ex))) {
      return false;
    }

    return roleLower.includes("tech") || roleLower.includes("electrician") || roleLower.includes("mechanic") || roleLower.includes("helper");
  }

  /**
   * Evaluates whether an employee is eligible to participate in labour revenue allocation.
   */
  public static canAllocateLabourRevenue(emp: EmployeeEligibilityProfile): boolean {
    if (!emp || emp.is_active === false || emp.is_active === 0) return false;

    if (typeof emp.is_labour_revenue_eligible === 'boolean' || typeof emp.is_labour_revenue_eligible === 'number') {
      return Boolean(emp.is_labour_revenue_eligible);
    }

    return this.canAssignTechnician(emp);
  }

  /**
   * Evaluates whether an employee can be allocated to a physical workshop bay.
   */
  public static canAssignBay(emp: EmployeeEligibilityProfile): boolean {
    if (!emp || emp.is_active === false || emp.is_active === 0) return false;

    if (typeof emp.is_bay_assignable === 'boolean' || typeof emp.is_bay_assignable === 'number') {
      return Boolean(emp.is_bay_assignable);
    }

    return this.canAssignTechnician(emp);
  }

  /**
   * Evaluates whether an employee can perform Quality Check (QC) approvals.
   */
  public static canPerformQC(emp: EmployeeEligibilityProfile): boolean {
    if (!emp || emp.is_active === false || emp.is_active === 0) return false;

    if (typeof emp.is_qc_eligible === 'boolean' || typeof emp.is_qc_eligible === 'number') {
      return Boolean(emp.is_qc_eligible);
    }

    const roleLower = (emp.role || "").toLowerCase();
    return roleLower.includes("qc") || roleLower.includes("quality") || roleLower.includes("supervisor") || roleLower.includes("manager");
  }

  /**
   * Evaluates whether an employee can attend emergency breakdown calls.
   */
  public static canAttendBreakdown(emp: EmployeeEligibilityProfile): boolean {
    if (!emp || emp.is_active === false || emp.is_active === 0) return false;

    if (typeof emp.is_breakdown_eligible === 'boolean' || typeof emp.is_breakdown_eligible === 'number') {
      return Boolean(emp.is_breakdown_eligible);
    }

    return this.canAssignTechnician(emp);
  }

  /**
   * Evaluates whether an employee can approve warranty claims.
   */
  public static canApproveWarranty(emp: EmployeeEligibilityProfile): boolean {
    if (!emp || emp.is_active === false || emp.is_active === 0) return false;

    if (typeof emp.is_warranty_eligible === 'boolean' || typeof emp.is_warranty_eligible === 'number') {
      return Boolean(emp.is_warranty_eligible);
    }

    const roleLower = (emp.role || "").toLowerCase();
    return roleLower.includes("warranty") || roleLower.includes("manager");
  }
}
