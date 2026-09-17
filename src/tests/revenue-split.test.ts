import { describe, it, expect } from "vitest";
import {
  calculateRevenueAllocation,
  getSeniorityScore,
  classifyRole,
  type TechnicianInput,
} from "../lib/revenue-split-engine";

/**
 * Labour-revenue allocation.
 *
 * ── What changed and why these tests exist ──────────────────────────────────
 *
 * Owner spec (2026-09-17): a two-person job splits 60/40 — the technician takes
 * 60, the assistant 40. The engine shipped 50/50, so every two-technician job
 * paid the pair evenly. That is a pay rule, so it is pinned here rather than
 * left to a docstring.
 *
 * The spec also defines a multi-vertical layer (mechanical vs electrical, 50/50
 * between verticals, with a vendor's payment deducted first) and a >4 headcount
 * override. NONE of that is implemented — there is no vertical on
 * job_technician_maps, and no vendor cost column exists to deduct. These tests
 * deliberately assert only the in-house rules that ARE implemented, so a green
 * suite here must not be read as "the full spec works".
 */

const tech = (
  employee_id: number,
  full_name: string,
  role = "technician",
  employee_grade?: string,
  basic_salary?: number
): TechnicianInput => ({ employee_id, full_name, role, employee_grade, basic_salary });

/** 1000 is divisible by 1, 2, 4, 5 and 8 — keeps the common cases round. */
const TOTAL = 1000;

const pctsOf = (rows: { split_pct: number }[]) => rows.map((r) => r.split_pct);

describe("calculateRevenueAllocation — the ratio ladder", () => {
  it("N=1: the whole labour amount to the sole technician", () => {
    const rows = calculateRevenueAllocation(1, [tech(1, "Ravi")], TOTAL);
    expect(rows).toHaveLength(1);
    expect(rows[0].split_pct).toBe(100);
    expect(rows[0].split_amount).toBe(1000);
    expect(rows[0].allocated_role).toBe("Primary Technician");
  });

  it("N=2: 60/40 — the technician takes 60, the assistant 40", () => {
    // The senior technician sorts first, so rows[0] must be the 60% side.
    const rows = calculateRevenueAllocation(
      2,
      [
        tech(10, "Ravi Kumar", "technician", "Senior", 30000),
        tech(11, "Sanjay Patel", "technician", "Junior", 12000),
      ],
      TOTAL
    );
    expect(pctsOf(rows)).toEqual([60, 40]);
    expect(rows.map((r) => r.split_amount)).toEqual([600, 400]);
    expect(rows[0].full_name).toBe("Ravi Kumar");
    expect(rows[1].full_name).toBe("Sanjay Patel");
    expect(rows[0].allocated_role).toBe("Lead Technician");
    expect(rows[1].allocated_role).toBe("Assistant Technician");
  });

  it("N=2 regression guard: an even split must NOT come back", () => {
    // This is the exact defect the owner reported. 50/50 here means the change
    // was reverted or shadowed by a later branch.
    const rows = calculateRevenueAllocation(
      3,
      [tech(10, "Lead", "technician", "Senior", 30000), tech(11, "Assistant", "technician", "Junior", 9000)],
      TOTAL
    );
    expect(pctsOf(rows)).not.toEqual([50, 50]);
    expect(rows[0].split_amount).toBeGreaterThan(rows[1].split_amount);
  });

  it("N=3: 40/30/30 with the senior on 40", () => {
    const rows = calculateRevenueAllocation(
      4,
      [
        tech(20, "Senior One", "mechanic", "Senior", 30000),
        tech(21, "Mid", "technician", "Junior", 15000),
        tech(22, "Junior One", "technician", "Junior", 9000),
      ],
      TOTAL
    );
    expect(pctsOf(rows)).toEqual([40, 30, 30]);
    expect(rows.map((r) => r.split_amount)).toEqual([400, 300, 300]);
    expect(rows[0].allocated_role).toBe("Senior Lead");
  });

  it("N=4: 25 each", () => {
    const rows = calculateRevenueAllocation(
      5,
      [1, 2, 3, 4].map((i) => tech(i, `Tech ${i}`, "technician", "Junior", 10000 + i)),
      TOTAL
    );
    expect(pctsOf(rows)).toEqual([25, 25, 25, 25]);
    expect(rows.every((r) => r.split_amount === 250)).toBe(true);
  });

  it("N>=5: divided equally across the technicians present", () => {
    const five = calculateRevenueAllocation(
      6,
      [1, 2, 3, 4, 5].map((i) => tech(i, `T${i}`, "technician", "Junior", 10000 + i)),
      TOTAL
    );
    expect(five.map((r) => r.split_amount)).toEqual([200, 200, 200, 200, 200]);
  });
});

describe("calculateRevenueAllocation — money integrity", () => {
  it("never loses or invents a rupee, whatever the headcount or the total", () => {
    // The tail row absorbs the rounding difference. A split that does not sum to
    // the labour amount would misstate every technician's pay on that job.
    const cases: Array<[number, number]> = [
      [1, 1000], [2, 1000], [2, 999.99], [3, 1000], [3, 777.77],
      [4, 1000], [5, 1000], [6, 1000], [7, 1234.56],
    ];
    for (const [n, total] of cases) {
      const rows = calculateRevenueAllocation(
        99,
        Array.from({ length: n }, (_, i) => tech(i + 1, `T${i + 1}`, "technician", "Junior", 10000 + i)),
        total
      );
      const sum = rows.reduce((s, r) => s + r.split_amount, 0);
      // The tail row absorbs the rounding difference, so the sum equals the EXACT
      // amount handed in — not a rounded version of it. (Asserting Math.round(total)
      // here was the test's own bug for total=999.99.)
      expect(sum, `N=${n} total=${total} must sum exactly`).toBeCloseTo(total, 2);
      // Percentages are display values; allow the sub-0.5 drift that rounding gives.
      expect(pctsOf(rows).reduce((s, p) => s + p, 0), `N=${n} pct sum`).toBeCloseTo(100, 0);
    }
  });

  it("uses only the labour amount it is given — parts are never split here", () => {
    // Callers pass labour alone; this pins that the engine does not add anything.
    const rows = calculateRevenueAllocation(7, [tech(1, "A"), tech(2, "B")], 500);
    expect(rows.reduce((s, r) => s + r.split_amount, 0)).toBe(500);
  });

  it("returns nothing for no technicians, or for a non-positive amount", () => {
    expect(calculateRevenueAllocation(8, [], TOTAL)).toEqual([]);
    expect(calculateRevenueAllocation(8, [tech(1, "A")], 0)).toEqual([]);
    expect(calculateRevenueAllocation(8, [tech(1, "A")], -50)).toEqual([]);
  });

  it("carries through the employee id, role and name for each allocation", () => {
    const rows = calculateRevenueAllocation(
      9,
      [tech(41, "Ravi Kumar", "electrician", "Senior", 20000), tech(42, "Helper", "mechanical_helper", "Junior", 8000)],
      TOTAL
    );
    expect(rows.map((r) => r.employee_id)).toEqual([41, 42]);
    expect(rows.map((r) => r.role)).toEqual(["electrician", "mechanical_helper"]);
  });
});

describe("seniority — who is offered the larger share", () => {
  it("ranks the higher-paid technician above a lower-paid one", () => {
    const senior = getSeniorityScore(tech(1, "S", "technician", "Junior", 30000));
    const junior = getSeniorityScore(tech(2, "J", "technician", "Junior", 9000));
    expect(senior).toBeGreaterThan(junior);
  });

  it("gives a Senior grade a boost over a Junior at equal salary", () => {
    const a = getSeniorityScore(tech(1, "S", "technician", "Senior", 15000));
    const b = getSeniorityScore(tech(2, "J", "technician", "Junior", 15000));
    expect(a).toBeGreaterThan(b);
  });

  it("KNOWN LIMITATION: the larger share follows SALARY, not the technician/assistant role", () => {
    // The owner spec assigns the big share by ROLE (technician vs ASSISTANT
    // technician). The engine ranks by salary first, so a low-paid lead paired
    // with a better-paid assistant is credited backwards. Pinned as a known
    // limitation so the eventual fix is a deliberate change, not a surprise.
    const rows = calculateRevenueAllocation(
      10,
      [
        tech(1, "Low-paid Lead", "technician", "Junior", 9000),
        tech(2, "Well-paid Assistant", "technician", "Junior", 30000),
      ],
      TOTAL
    );
    expect(rows[0].full_name).toBe("Well-paid Assistant");
    expect(rows[0].split_pct).toBe(60);
  });

  it("classifies raw role strings into the buckets the engine knows", () => {
    expect(classifyRole("Mechanic")).toBe("Mechanic");
    expect(classifyRole("wheel_alignment")).toBe("Mechanic");
    expect(classifyRole("electrician")).toBe("Electrician");
    expect(classifyRole("technician")).toBe("Technician");
    // Substring match on "mech", so a mechanical helper lands in the MECHANICS
    // bucket, not in the catch-all. Recorded deliberately: it is the first real
    // input to the vertical mapping the owner still has to settle.
    expect(classifyRole("mechanical_helper")).toBe("Mechanic");
    // Only a role matching no bucket at all falls through.
    expect(classifyRole("helper")).toBe("Additional Tech");
    // NOTE: no vertical is derived from classifyRole — it returns four buckets and
    // the owner spec has two in-house verticals (mechanics, electrical).
  });
});
