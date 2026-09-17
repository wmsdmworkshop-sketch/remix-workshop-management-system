import { describe, it, expect } from "vitest";
import {
  buildCustodyEntityIndex,
  mergeCustodyHandoffs,
  normaliseVrn,
} from "../core/workshop/custody-entity-keys";

/**
 * Chain-of-custody entity indexing.
 *
 * ── What these tests protect ────────────────────────────────────────────────
 *
 * The custody panel showed "Not recorded" for holder, stage, holding-since, SLA
 * due and handoff on a live vehicle. The cause was not a missing row: three of
 * the four identifier forms an engine writes into `tbl_handoff_sla.entity_id`
 * were never searched.
 *
 *   GATE_TO_RECEPTION    -> gate entry id
 *   RECEPTION_TO_MANAGER -> intake id
 *   SLA_MANAGER_TO_SA    -> intake id
 *   later stages         -> job card number / numeric id
 *
 * The first three are neither of the two forms the query used, so the entire
 * intake half of the journey was unreachable. Measured 2026-09-14, 189 + 203 +
 * 199 of 626 production rows carried those keys.
 *
 * No database here: the index is a pure function of the rows the caller fetched,
 * so every branch is decidable in milliseconds.
 */

const card = (id: number, no: string | null, reg: string | null = null) => ({
  job_card_id: id,
  job_card_no: no,
  vehicle_reg: reg,
});

describe("normaliseVrn", () => {
  it("treats punctuation and case as insignificant", () => {
    expect(normaliseVrn("ka28aa2912")).toBe("KA28AA2912");
    expect(normaliseVrn("KA-28-AA-2912")).toBe("KA28AA2912");
    expect(normaliseVrn(" KA 28 AA 2912 ")).toBe("KA28AA2912");
    expect(normaliseVrn(null)).toBe("");
    expect(normaliseVrn(undefined)).toBe("");
  });
});

describe("buildCustodyEntityIndex — the identifiers a card always contributes", () => {
  it("indexes both the job card number and the numeric id", () => {
    const { entityKeys, jobIdByEntity } = buildCustodyEntityIndex([card(7386, "JC-41368")]);
    expect(entityKeys).toContain("JC-41368");
    expect(entityKeys).toContain("7386");
    expect(jobIdByEntity.get("JC-41368")).toBe(7386);
    expect(jobIdByEntity.get("7386")).toBe(7386);
  });

  it("keys the map on the UPPERCASED stored form", () => {
    const { jobIdByEntity } = buildCustodyEntityIndex([card(7386, "JC-41368")]);
    expect(jobIdByEntity.get("JC-41368")).toBe(7386);
  });

  it("still resolves a lowercased entity_id arriving from a handoff row", () => {
    // The map is keyed uppercase and the LOOKUP side normalises, which together
    // are what make matching case-insensitive (the SQL COLLATE only covers the
    // IN(...) predicate, not the map). This is the contract that matters: a row
    // written as "jc-41368" must land on the right card.
    const index = buildCustodyEntityIndex([card(7386, "JC-41368")]);
    const summaries: Record<string, any> = {
      "7386": {
        holder: null, holder_stage: null, breached: null, escalated: null,
        holder_known: false, holder_since: null, sla_due_at: null, handoff_status: null,
      },
    };
    mergeCustodyHandoffs(summaries, [
      { entity_id: "jc-41368", stage_name: "SA_TO_FLOOR", owner_role: "technician", status: "ON_TRACK" },
    ], index.jobIdByEntity);
    expect(summaries["7386"].holder).toBe("technician");
  });

  it("never emits a duplicate key when a card number equals its own id", () => {
    const { entityKeys } = buildCustodyEntityIndex([card(7, "7")]);
    expect(entityKeys.filter((k) => k === "7")).toHaveLength(1);
  });

  it("skips blank, null and degenerate identifiers", () => {
    const { entityKeys } = buildCustodyEntityIndex([
      { job_card_id: 42, job_card_no: "   ", vehicle_reg: null },
      { job_card_id: 43, job_card_no: null, vehicle_reg: null },
    ]);
    // Only the two numeric ids are usable.
    expect(entityKeys.sort()).toEqual(["42", "43"]);
  });
});

describe("buildCustodyEntityIndex — the intake bridge (the actual bug)", () => {
  it("adds the GATE ENTRY id so a GATE_TO_RECEPTION clock becomes findable", () => {
    const { entityKeys, jobIdByEntity } = buildCustodyEntityIndex(
      [card(7386, "JC-41368", "KA28AA2912")],
      [{ job_card_id: "JC-41368", gate_entry_id: "GE-765B6395", intake_id: "INT-ABC123" }]
    );
    expect(entityKeys).toContain("GE-765B6395");
    // This is the key the old query could never produce, which is why the panel
    // said "Not recorded" while the gate->reception clock was running.
    expect(jobIdByEntity.get("GE-765B6395")).toBe(7386);
  });

  it("adds the INTAKE id so RECEPTION_TO_MANAGER and SLA_MANAGER_TO_SA become findable", () => {
    const { jobIdByEntity } = buildCustodyEntityIndex(
      [card(7386, "JC-41368", "KA28AA2912")],
      [{ job_card_id: "JC-41368", gate_entry_id: "GE-1", intake_id: "INT-ABC123" }]
    );
    expect(jobIdByEntity.get("INT-ABC123")).toBe(7386);
  });

  it("matches the intake row on the job card NUMBER, case and padding insensitive", () => {
    const { jobIdByEntity } = buildCustodyEntityIndex(
      [card(7386, "JC-41368")],
      [{ job_card_id: "  jc-41368 ", gate_entry_id: "GE-9", intake_id: "INT-9" }]
    );
    expect(jobIdByEntity.get("GE-9")).toBe(7386);
  });

  it("ignores an intake row belonging to a card we cannot see", () => {
    const { entityKeys } = buildCustodyEntityIndex(
      [card(7386, "JC-41368")],
      [{ job_card_id: "JC-99999", gate_entry_id: "GE-OTHER", intake_id: "INT-OTHER" }]
    );
    expect(entityKeys).not.toContain("GE-OTHER");
    expect(entityKeys).not.toContain("INT-OTHER");
  });
});

describe("buildCustodyEntityIndex — VRN fallback for cards with no intake row", () => {
  it("resolves when the registration maps to exactly one gate entry", () => {
    const { entityKeys, jobIdByEntity, unresolvedJobIds } = buildCustodyEntityIndex(
      [card(7386, "JC-41368", "KA28AA2912")],
      [],
      [{ gate_entry_id: "GE-SOLO", intake_id: "INT-SOLO", vin: "KA28AA2912" }]
    );
    expect(jobIdByEntity.get("GE-SOLO")).toBe(7386);
    expect(entityKeys).toContain("INT-SOLO");
    expect(unresolvedJobIds).toEqual([]);
  });

  it("resolves NOTHING when the registration has more than one gate entry", () => {
    // A repeat-visit VRN. Attributing the wrong arrival would print a wrong
    // holder and SLA on a live vehicle, which is worse than a blank panel.
    const { jobIdByEntity, unresolvedJobIds } = buildCustodyEntityIndex(
      [card(7386, "JC-41368", "KA28AA2912")],
      [],
      [
        { gate_entry_id: "GE-VISIT1", intake_id: "INT-1", vin: "KA28AA2912" },
        { gate_entry_id: "GE-VISIT2", intake_id: "INT-2", vin: "KA-28-AA-2912" },
      ]
    );
    expect(jobIdByEntity.get("GE-VISIT1")).toBeUndefined();
    expect(jobIdByEntity.get("GE-VISIT2")).toBeUndefined();
    expect(jobIdByEntity.get("INT-1")).toBeUndefined();
    expect(unresolvedJobIds).toContain(7386);
  });

  it("does not use the fallback for a card the intake bridge already resolved", () => {
    const { jobIdByEntity } = buildCustodyEntityIndex(
      [card(7386, "JC-41368", "KA28AA2912")],
      [{ job_card_id: "JC-41368", gate_entry_id: "GE-EXACT", intake_id: "INT-EXACT" }],
      [{ gate_entry_id: "GE-STALE", intake_id: "INT-STALE", vin: "KA28AA2912" }]
    );
    expect(jobIdByEntity.get("GE-EXACT")).toBe(7386);
    // The stale arrival must not be attached to this card.
    expect(jobIdByEntity.get("GE-STALE")).toBeUndefined();
  });

  it("ignores rows whose vin is blank", () => {
    const { jobIdByEntity } = buildCustodyEntityIndex(
      [card(7386, "JC-41368", "KA28AA2912")],
      [],
      [{ gate_entry_id: "GE-NOVIN", intake_id: null, vin: null }]
    );
    expect(jobIdByEntity.get("GE-NOVIN")).toBeUndefined();
  });
});

describe("mergeCustodyHandoffs — who holds it now", () => {
  /** Mirrors the shape the route builds before merging. */
  const summariesFor = (ids: number[]) => {
    const s: Record<string, any> = {};
    for (const id of ids) {
      s[String(id)] = {
        complaints: 0, actors: 0, holder: null, holder_stage: null,
        breached: null, escalated: null, holder_known: false,
        etd: null, holder_since: null, sla_due_at: null, handoff_status: null,
      };
    }
    return s;
  };

  it("reports the holder for a clock keyed on the GATE ENTRY id", () => {
    // The regression case: this row was previously unreachable, so the panel
    // said "Not recorded" for a vehicle reception was actually holding.
    const cards = [card(7386, "JC-41368", "KA28AA2912")];
    const index = buildCustodyEntityIndex(cards, [
      { job_card_id: "JC-41368", gate_entry_id: "GE-765B6395", intake_id: "INT-A" },
    ]);
    const summaries = summariesFor([7386]);

    mergeCustodyHandoffs(summaries, [
      {
        entity_id: "GE-765B6395", stage_name: "GATE_TO_RECEPTION", owner_role: "receptionist",
        status: "BREACHED", opened_at: "2026-09-16T09:00:00Z", sla_due_at: "2026-09-16T09:10:00Z",
        escalation_level: 1,
      },
    ], index.jobIdByEntity);

    const s = summaries["7386"];
    expect(s.holder).toBe("receptionist");
    expect(s.holder_stage).toBe("GATE_TO_RECEPTION");
    expect(s.holder_known).toBe(true);
    expect(s.handoff_status).toBe("BREACHED");
    expect(s.breached).toBe(true);
    expect(s.escalated).toBe(true);
  });

  it("takes the MOST RECENT clock when several are in flight", () => {
    const cards = [card(7386, "JC-41368", "KA28AA2912")];
    const index = buildCustodyEntityIndex(cards, [
      { job_card_id: "JC-41368", gate_entry_id: "GE-1", intake_id: "INT-A" },
    ]);
    const summaries = summariesFor([7386]);

    // Ascending by opened_at, exactly as the SQL returns them.
    mergeCustodyHandoffs(summaries, [
      { entity_id: "GE-1", stage_name: "GATE_TO_RECEPTION", owner_role: "receptionist", status: "ACCEPTED", opened_at: "2026-09-16T09:00:00Z" },
      { entity_id: "INT-A", stage_name: "RECEPTION_TO_MANAGER", owner_role: "service_manager", status: "ON_TRACK", opened_at: "2026-09-16T10:00:00Z" },
    ], index.jobIdByEntity);

    expect(summaries["7386"].holder).toBe("service_manager");
    expect(summaries["7386"].holder_stage).toBe("RECEPTION_TO_MANAGER");
  });

  it("ignores rows for entities that belong to no visible card", () => {
    const summaries = summariesFor([7386]);
    mergeCustodyHandoffs(summaries, [
      { entity_id: "GE-NOT-MINE", stage_name: "GATE_TO_RECEPTION", owner_role: "receptionist", status: "ON_TRACK" },
    ], new Map([["7386", 7386]]));
    expect(summaries["7386"].holder).toBeNull();
  });

  it("HONESTY: leaves escalated/breached null rather than claiming 'No'", () => {
    // "No" is an assertion the data cannot support when nothing matched. It used
    // to render as "Escalated: No" on a vehicle whose intake clock was breached.
    const summaries = summariesFor([7386]);
    mergeCustodyHandoffs(summaries, [], new Map([["7386", 7386]]));
    expect(summaries["7386"].escalated).toBeNull();
    expect(summaries["7386"].breached).toBeNull();
    expect(summaries["7386"].holder_known).toBe(false);
  });

  it("makes escalated/breached genuine booleans once a clock IS matched", () => {
    const summaries = summariesFor([7386]);
    mergeCustodyHandoffs(summaries, [
      { entity_id: "7386", stage_name: "SLA_FLOOR_TO_QC", owner_role: "qc_incharge", status: "ACCEPTED", escalation_level: 0 },
    ], new Map([["7386", 7386]]));
    expect(summaries["7386"].holder_known).toBe(true);
    expect(summaries["7386"].breached).toBe(false);
    expect(summaries["7386"].escalated).toBe(false);
  });

  it("tolerates a null owner_role without inventing a holder", () => {
    const summaries = summariesFor([7386]);
    mergeCustodyHandoffs(summaries, [
      { entity_id: "7386", stage_name: "SA_TO_FLOOR", owner_role: null, status: "ON_TRACK" },
    ], new Map([["7386", 7386]]));
    // A matched row with no named owner is still "known" — the stage is real —
    // but the holder must stay an absence rather than become a placeholder.
    expect(summaries["7386"].holder).toBeNull();
    expect(summaries["7386"].holder_stage).toBe("SA_TO_FLOOR");
    expect(summaries["7386"].holder_known).toBe(true);
  });
});
