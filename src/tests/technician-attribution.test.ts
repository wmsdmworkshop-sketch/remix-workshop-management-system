import { describe, it, expect } from "vitest";
import { resolveJobTechnicians } from "../core/workshop/technician-attribution";
import { calculateRevenueAllocation } from "../lib/revenue-split-engine";

/**
 * Technician attribution.
 *
 * WHY: the labour-split engine read `job_technician_maps`, which holds 1 row in
 * production while 537 of 671 job cards record their technician in
 * `job_card_master.assigned_to`. These tests pin the resolution order and, more
 * importantly, pin the REFUSALS — the old code paid a literal "Unknown" person,
 * which EAR-001 forbids and which would divide real wages by someone who does
 * not exist.
 */

const ROSTER = [
  { employee_id: 74, full_name: "MUSTAFA", role: "Service Advisor", employee_grade: "Senior", basic_salary: 30000 },
  { employee_id: 57, full_name: "LOKU", role: "Technician", employee_grade: "Senior", basic_salary: 25000 },
  { employee_id: 5, full_name: "ASIF", role: "Electrician", employee_grade: "Senior", basic_salary: 25000 },
  { employee_id: 55, full_name: "HAMEED PATEL", role: "Wheel Alignment", employee_grade: "Junior", basic_salary: 18000 },
];

describe("resolveJobTechnicians — resolution order", () => {
  it("prefers an explicit allocation row over assigned_to", () => {
    const r = resolveJobTechnicians({
      maps: [{ employee_id: 5, tech_role: "Primary Technician" }],
      assignedTo: 57,
      employees: ROSTER,
    });
    expect(r.source).toBe("tech_map");
    expect(r.technicians.map((t) => t.employee_id)).toEqual([5]);
  });

  it("falls back to assigned_to when there are no allocation rows", () => {
    // This is the case for effectively every job in production today.
    const r = resolveJobTechnicians({ maps: [], assignedTo: 57, employees: ROSTER });
    expect(r.source).toBe("assigned_to");
    expect(r.technicians).toHaveLength(1);
    expect(r.technicians[0].employee_id).toBe(57);
    expect(r.technicians[0].full_name).toBe("LOKU");
    expect(r.technicians[0].role).toBe("Technician");
  });

  it("accepts assigned_to as a string, which is how the driver can return it", () => {
    const r = resolveJobTechnicians({ maps: [], assignedTo: "74", employees: ROSTER });
    expect(r.source).toBe("assigned_to");
    expect(r.technicians[0].employee_id).toBe(74);
  });

  it("carries the employee's real grade and salary through", () => {
    const r = resolveJobTechnicians({ maps: [], assignedTo: 55, employees: ROSTER });
    expect(r.technicians[0]).toMatchObject({
      employee_id: 55,
      employee_grade: "Junior",
      basic_salary: 18000,
    });
  });

  it("carries multiple allocation rows through unchanged", () => {
    const r = resolveJobTechnicians({
      maps: [{ employee_id: 57 }, { employee_id: 5 }],
      employees: ROSTER,
    });
    expect(r.source).toBe("tech_map");
    expect(r.technicians.map((t) => t.employee_id)).toEqual([57, 5]);
  });
});

describe("resolveJobTechnicians — refuses rather than invents", () => {
  it("never produces a placeholder person when assigned_to matches nobody", () => {
    const r = resolveJobTechnicians({ maps: [], assignedTo: 999, employees: ROSTER });
    expect(r.technicians).toEqual([]);
    expect(r.source).toBe("none");
    expect(r.unresolved).toEqual([999]);
  });

  it("fails the WHOLE job closed if any allocation row is unresolvable", () => {
    // Paying only the resolvable half would silently redistribute the missing
    // person's share among the survivors.
    const r = resolveJobTechnicians({
      maps: [{ employee_id: 57 }, { employee_id: 999 }],
      employees: ROSTER,
    });
    expect(r.technicians).toEqual([]);
    expect(r.unresolved).toEqual([999]);
  });

  it("never emits the string 'Unknown' as a technician name", () => {
    // Regression guard on the behaviour this module replaced.
    const r = resolveJobTechnicians({ maps: [{ employee_id: 4242 }], employees: ROSTER });
    expect(r.technicians).toEqual([]);
    expect(JSON.stringify(r)).not.toContain("Unknown");
  });

  it("returns nothing when neither source has a technician", () => {
    const r = resolveJobTechnicians({ maps: [], assignedTo: null, employees: ROSTER });
    expect(r.technicians).toEqual([]);
    expect(r.source).toBe("none");
    expect(r.unresolved).toEqual([]);
  });

  it("treats a blank assigned_to as absent rather than as employee 0", () => {
    for (const blank of ["", "   ", null, undefined]) {
      const r = resolveJobTechnicians({ maps: [], assignedTo: blank, employees: ROSTER });
      expect(r.technicians, `assignedTo=${JSON.stringify(blank)}`).toEqual([]);
      expect(r.unresolved, `assignedTo=${JSON.stringify(blank)}`).toEqual([]);
    }
  });

  it("survives missing arguments without throwing", () => {
    expect(resolveJobTechnicians({}).technicians).toEqual([]);
    expect(resolveJobTechnicians({ maps: null, employees: null }).technicians).toEqual([]);
  });
});

describe("attribution feeds the split engine end to end", () => {
  it("produces a real 100% allocation for a single-technician job", () => {
    // The pipeline that has never run in production: assigned_to -> attribution
    // -> calculateRevenueAllocation -> a paid split.
    const attribution = resolveJobTechnicians({ maps: [], assignedTo: 57, employees: ROSTER });
    expect(attribution.technicians).toHaveLength(1);

    const rows = calculateRevenueAllocation(42, attribution.technicians, 2500);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      employee_id: 57,
      full_name: "LOKU",
      split_pct: 100,
      split_amount: 2500,
      allocated_role: "Primary Technician",
    });
  });

  it("allocates nothing when attribution refuses, so no wages are invented", () => {
    const attribution = resolveJobTechnicians({ maps: [], assignedTo: 999, employees: ROSTER });
    const rows = calculateRevenueAllocation(42, attribution.technicians, 2500);
    expect(rows).toEqual([]);
  });
});
