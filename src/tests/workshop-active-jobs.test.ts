import { describe, it, expect } from "vitest";
import {
  JOB_STATUS_VALUES,
  hasLeftWorkshop,
  isWorkCompleteStatus,
  isDeliveredStatus,
} from "../types";

/**
 * "In the workshop" is a KPI on the My Workspace dashboard, and it was wrong on
 * production: the tile read 628 against 628 job cards, while the job card list
 * beside it correctly said 64 in the workshop / 564 delivered.
 *
 * Root cause: the count excluded ['completed','invoiced','cancelled'] — three
 * values job_card_master's job_status ENUM cannot hold, so the filter matched
 * nothing and every delivered vehicle counted as active work.
 *
 * These tests pin the definition to the shared predicate so the two screens
 * cannot disagree again. The fixture mirrors the production shape exactly:
 * 628 cards total, 564 of them history, 64 genuinely on site.
 */

/** The exact predicate that produced 628. Kept to prove it is dead code. */
const legacyIsClosed = (status: string) =>
  ["completed", "invoiced", "cancelled"].includes(String(status || "").toLowerCase());

interface Fixture {
  job_id: number;
  status: string;
  gate_out_time?: string | null;
  etd?: string | null;
  service_advisor?: string | null;
}

/** 628 cards: 564 finished visits, 64 still on site. */
function productionShapedCards(): Fixture[] {
  const cards: Fixture[] = [];
  let id = 1;

  // 562 cards whose workload status reached the terminal 'Delivered'.
  // 435 of them also carry a gate-out stamp (as production does); the rest were
  // mapped to Delivered from the source system's free-text status column.
  for (let i = 0; i < 562; i++) {
    cards.push({
      job_id: id++,
      status: "Delivered",
      gate_out_time: i < 435 ? "2026-08-01T10:00:00.000Z" : null,
      etd: "2026-07-30T10:00:00.000Z",
      service_advisor: "R. Kadam",
    });
  }

  // 2 cards that never had their status advanced, but which DO carry a recorded
  // gate-out — the ground truth that the vehicle physically left the site.
  for (let i = 0; i < 2; i++) {
    cards.push({
      job_id: id++,
      status: "Ready",
      gate_out_time: "2026-08-02T10:00:00.000Z",
      etd: "2026-08-02T09:00:00.000Z",
      service_advisor: "R. Kadam",
    });
  }

  // 64 genuinely still on site. 15 of them have no service advisor yet.
  const live: Array<[string, number]> = [
    ["In Progress", 44],
    ["Ready", 9],
    ["Unassigned", 6],
    ["Assigned", 5],
  ];
  let liveIndex = 0;
  for (const [status, count] of live) {
    for (let i = 0; i < count; i++) {
      cards.push({
        job_id: id++,
        status,
        gate_out_time: null,
        // A promise in the past — a real, overdue card.
        etd: "2026-09-01T09:00:00.000Z",
        service_advisor: liveIndex < 15 ? null : "R. Kadam",
      });
      liveIndex++;
    }
  }

  return cards;
}

describe("hasLeftWorkshop — the single definition of 'still in the workshop'", () => {
  it("is not satisfiable by the values the old KPI compared against", () => {
    // The schema is the authority. If any of these ever became legal values the
    // original predicate would have worked by accident; it did not.
    const legal = JOB_STATUS_VALUES as readonly string[];
    expect(legal).not.toContain("completed");
    expect(legal).not.toContain("invoiced");
    expect(legal).not.toContain("cancelled");
    // ...and the values it should be reasoning about are all present.
    expect(legal).toContain("Delivered");
    expect(legal).toContain("Ready");
    expect(legal).toContain("In Progress");
  });

  it("counts only vehicles that are genuinely still on site", () => {
    const cards = productionShapedCards();
    expect(cards).toHaveLength(628);

    // The predicate the dashboard now uses.
    expect(cards.filter((c) => !hasLeftWorkshop(c))).toHaveLength(64);
    // The tile that was on screen.
    expect(cards.filter((c) => hasLeftWorkshop(c))).toHaveLength(564);
  });

  it("reproduces the 628 production bug with the old predicate", () => {
    const cards = productionShapedCards();
    const legacyActive = cards.filter((c) => !legacyIsClosed(c.status)).length;

    expect(legacyActive).toBe(628); // exactly what the dashboard displayed
    expect(cards.filter((c) => !hasLeftWorkshop(c))).toHaveLength(64); // the truth
  });

  it("treats a recorded gate-out as proof the vehicle left, whatever the status says", () => {
    // 'Ready' means the work is finished but the vehicle is still holding a bay.
    expect(hasLeftWorkshop({ status: "Ready", gate_out_time: null })).toBe(false);
    // The same status WITH a gate-out stamp is history.
    expect(hasLeftWorkshop({ status: "Ready", gate_out_time: "2026-08-02T10:00:00Z" })).toBe(true);
    // And 'Delivered' is enough on its own — imported cards may have no stamp.
    expect(hasLeftWorkshop({ status: "Delivered", gate_out_time: null })).toBe(true);
  });

  it("keeps work-complete distinct from gone", () => {
    // A trap this predicate must not fall into: 'Ready' is work-complete but the
    // vehicle is still on site and still the workshop's problem.
    expect(isWorkCompleteStatus("Ready")).toBe(true);
    expect(hasLeftWorkshop({ status: "Ready", gate_out_time: null })).toBe(false);

    expect(isDeliveredStatus("Delivered")).toBe(true);
    expect(hasLeftWorkshop({ status: "Delivered" })).toBe(true);
  });

  it("never throws on a missing or malformed card", () => {
    expect(hasLeftWorkshop(null)).toBe(false);
    expect(hasLeftWorkshop(undefined)).toBe(false);
    expect(hasLeftWorkshop({})).toBe(false);
    expect(hasLeftWorkshop({ status: null, gate_out_time: null })).toBe(false);
  });

  it("counts an overdue promise from etd, the field the cards actually carry", () => {
    const now = new Date("2026-09-02T00:00:00Z").getTime();
    const cards = productionShapedCards();
    const breaches = cards
      .filter((c) => !hasLeftWorkshop(c))
      .filter((c) => {
        const due = c.etd;
        const t = due ? new Date(due).getTime() : NaN;
        return !isNaN(t) && t < now;
      });

    // The 64 live cards all carry a past promise date.
    expect(breaches).toHaveLength(64);

    // The four field names the endpoint previously read are set by nothing in
    // the codebase, which is why the tile could only ever show 0.
    const phantomDue = (c: any) =>
      c.promised_delivery || c.promised_delivery_date || c.expected_delivery || c.due_date;
    expect(cards.filter((c) => phantomDue(c)).length).toBe(0);
  });
});
