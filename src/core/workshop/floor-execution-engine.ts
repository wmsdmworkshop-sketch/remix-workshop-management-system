import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { VosCorePlatform } from "../vos";

/**
 * Physical bay capacity. A bay holds one vehicle on the floor, but a second can
 * be parked immediately behind it while it waits. Two is therefore the hard
 * ceiling — confirmed with the workshop operator — and more than two is not
 * physically possible regardless of what the system would otherwise allow.
 */
const BAY_MAX_VEHICLES = 2;

export interface FloorHandoffItem {
  jobCardId: string;
  gateEntryId?: string;
  vosId?: string;
  vrn: string;
  vehicleModel: string;
  customerName: string;
  saName: string;
  jobType: string;
  complaintCount: number;
  priority: string;
  isWarranty: boolean;
  partsDependency: boolean;
  customerApprovalState: string;
  receivedAt: string;
  waitingMins: number;
  slaRemainingMins: number;
  isSlaBreached: boolean;
  suggestedBayId?: string;
  suggestedTechId?: string;
}

export interface BayRosterItem {
  bayId: string;
  bayName: string;
  bayType: string;
  lobSuitability: string;
  status: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "BLOCKED" | "OUT_OF_SERVICE";
  currentJobCardId?: string;
  currentVrn?: string;
  occupiedSince?: string;
  elapsedOccupationMins?: number;
  currentOperation?: string;
  isDelayed?: boolean;
}

export interface TechRosterItem {
  technicianId: string;
  technicianName: string;
  role: string;
  certification: string;
  lobCompetency: string;
  currentJobCardId?: string;
  currentVrn?: string;
  currentBayId?: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  activeWorkload: number;
  todayProductiveMins: number;
  currentJobElapsedMins?: number;
}

export interface AiAllocationSuggestion {
  bayId: string;
  bayName: string;
  technicianId: string;
  technicianName: string;
  reason: string;
  confidenceScore: number;
}

export class FloorExecutionEngine {
  private static instance: FloorExecutionEngine;

  // In-memory fallback stores for high availability & test simulation
  private inMemoryBays: Map<string, BayRosterItem> = new Map();
  private inMemoryAllocations: Map<string, any> = new Map();
  private inMemoryExecutions: Map<string, any> = new Map();
  private inMemoryPartsRequests: Map<string, any> = new Map();
  private inMemoryWarrantyReviews: Map<string, any> = new Map();
  private inMemoryAdditionalFindings: Map<string, any> = new Map();
  private inMemoryEtaExtensions: Map<string, any> = new Map();
  private inMemoryQcHandoffs: Map<string, any> = new Map();
  private inMemoryHandoffSla: Map<string, any> = new Map();

  private constructor() {
    this.seedBaselineBays();
    this.seedBaselineExecutions();
  }

  public static getInstance(): FloorExecutionEngine {
    if (!FloorExecutionEngine.instance) {
      FloorExecutionEngine.instance = new FloorExecutionEngine();
    }
    return FloorExecutionEngine.instance;
  }

  private seedBaselineBays(): void {
    const defaultBays: BayRosterItem[] = [
      { bayId: "B-01", bayName: "Bay 01 - Heavy Commercial", bayType: "HCV", lobSuitability: "HCV", status: "AVAILABLE" },
      { bayId: "B-02", bayName: "Bay 02 - General Repair", bayType: "GENERAL", lobSuitability: "ALL", status: "AVAILABLE" },
      { bayId: "B-03", bayName: "Bay 03 - EV & Electrical", bayType: "EV", lobSuitability: "EV", status: "AVAILABLE" },
      { bayId: "B-04", bayName: "Bay 04 - Express Bay", bayType: "EXPRESS", lobSuitability: "MCV_LCV", status: "AVAILABLE" },
      { bayId: "B-05", bayName: "Bay 05 - Washing & Detail", bayType: "WASH", lobSuitability: "ALL", status: "AVAILABLE" },
      { bayId: "B-99", bayName: "Bay 99 - Maintenance Blocked", bayType: "GENERAL", lobSuitability: "ALL", status: "BLOCKED" }
    ];
    for (const b of defaultBays) {
      this.inMemoryBays.set(b.bayId, b);
    }
  }

  private seedBaselineExecutions(): void {
    // Intentionally empty. This used to seed a fabricated in-progress execution
    // ("Clutch Assembly Replacement" on JC-TEST-501 by technician Ravi Kumar)
    // that surfaced on the floor alongside genuine work.
  }

  /**
   * Helper: Create SLA Timer
   */
  public async createHandoffSla(
    stageName: string,
    entityId: string,
    ownerId: string,
    ownerRole: string,
    slaMins: number = 5,
    branchId: string = "BR-SEDAM"
  ) {
    const handoffId = `SLA-${randomUUID().substring(0, 8).toUpperCase()}`;
    const now = new Date();
    const dueAt = new Date(now.getTime() + slaMins * 60 * 1000);
    const status = slaMins < 0 ? "BREACHED" : "ON_TRACK";
    const isBreached = status === "BREACHED";

    try {
      await db.execute(
        `INSERT INTO tbl_handoff_sla 
         (handoff_id, stage_name, entity_id, owner_id, owner_role, sla_due_at, status, branch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [handoffId, stageName, entityId, ownerId, ownerRole, dueAt, status, branchId]
      );
    } catch (e) {
      // Ignore DB missing table in fallback
    }

    const item = { handoffId, stageName, entityId, ownerId, ownerRole, dueAt, status, isBreached, branchId };
    this.inMemoryHandoffSla.set(handoffId, item);
    return item;
  }

  /**
   * 1. Acknowledge Floor Handoff
   */
  public async acknowledgeFloorHandoff(
    jobCardId: string,
    floorId: string,
    floorName: string
  ): Promise<{ success: boolean; acknowledgedAt: string }> {
    const now = new Date().toISOString();

    try {
      await db.execute(
        "UPDATE tbl_handoff_sla SET accepted_at = NOW(), status = 'ACCEPTED' WHERE entity_id = ? AND stage_name = 'SLA_SA_TO_FLOOR'",
        [jobCardId]
      );
    } catch (e) {}

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-${jobCardId}`,
        timelineType: "OPERATIONAL",
        eventType: "FLOOR_HANDOFF_ACKNOWLEDGED",
        title: `Floor In-Charge ${floorName} Acknowledged Vehicle`,
        metadata: { floorId, floorName, acknowledgedAt: now }
      });
    } catch (e) {}

    return { success: true, acknowledgedAt: now };
  }

  /**
   * 2. Retrieve MY NEW JOBS Queue sorted by operational urgency
   */
  public async getFloorPendingQueue(floorId: string, branchId: string = "BR-SEDAM"): Promise<FloorHandoffItem[]> {
    let rows: any[] = [];
    try {
      // Three defects were stacked in this one query, and the catch below hid
      // all of them — the supervisor just saw an empty queue:
      //
      // 1. `g.registration_number` does not exist on tbl_gate_entry. The column
      //    list is (gate_entry_id, vin, odometer, source, driver_details,
      //    initial_remarks, status, arrival_time) and the VRN is held in `vin`
      //    (see the note in realtime-ownership-pipeline.ts). The query threw
      //    "Unknown column" on EVERY call, so this queue could never return a
      //    row — regardless of branch or status.
      // 2. `g.vehicle_model` does not exist either; the model is not on the gate
      //    entry at all, so it is dropped rather than invented.
      // 3. The status filter listed FLOOR_HANDOFF_CREATED / INTAKE_STARTED /
      //    JC_CREATED — none of which any real row has ever held. SA technical
      //    intake writes 'SENT_TO_FLOOR' (sa-technical-intake.ts), and all 4
      //    rows in production carry exactly that. So even with the column bug
      //    fixed, the filter matched nothing.
      //
      // Some historic rows store the plate prefixed ("VIN-KA32AB0307"), so the
      // prefix is stripped here rather than surfacing it to the supervisor.
      // 4. The gate-entry join was LEFT, and the VRN fell back to "—". An intake
      //    whose gate entry has been deleted (purge_vehicle.cjs removes the gate
      //    entry but historically left tbl_sa_intake behind) therefore appeared
      //    on the supervisor floor as a blank row — no plate, no model — and
      //    ALLOCATE on it succeeded, committing a bay and a technician to a
      //    vehicle that does not exist. INNER JOIN: no gate entry means no
      //    vehicle, which is not floor work. Orphans are surfaced by the
      //    diagnostic below rather than silently served as jobs.
      const [dbRows] = await db.execute(
        `SELECT s.*, r.token_number,
                TRIM(LEADING 'VIN-' FROM g.vin) AS vrn
         FROM tbl_sa_intake s
         INNER JOIN tbl_gate_entry g ON s.gate_entry_id = g.gate_entry_id
         LEFT JOIN tbl_reception_intake r ON s.gate_entry_id = r.gate_entry_id
         WHERE s.branch_id = ? AND s.status = 'SENT_TO_FLOOR'
         ORDER BY s.created_at ASC`,
        [branchId]
      ) as any[];

      // An orphan is a data fault, not an empty queue. Log it so it is fixed at
      // source instead of quietly disappearing from the floor.
      const [orphanRows]: any = await db.execute(
        `SELECT s.intake_id, s.gate_entry_id FROM tbl_sa_intake s
          LEFT JOIN tbl_gate_entry g ON s.gate_entry_id = g.gate_entry_id
          WHERE s.branch_id = ? AND s.status = 'SENT_TO_FLOOR' AND g.gate_entry_id IS NULL`,
        [branchId]
      );
      if (orphanRows?.length) {
        console.warn(
          `[FloorExecutionEngine] ${orphanRows.length} orphaned SA intake(s) withheld from the floor queue (gate entry deleted): ` +
            orphanRows.map((o: any) => `${o.intake_id}->${o.gate_entry_id}`).join(", ")
        );
      }
      rows = dbRows || [];
    } catch (e: any) {
      // Do not swallow silently: a broken query here is indistinguishable from
      // "no work waiting", which is exactly how the three defects above stayed
      // invisible.
      console.error("[FloorExecutionEngine] getFloorPendingQueue failed:", e.message);
    }

    // No pending handoffs is an honest empty list. This used to return a
    // fabricated "reference" job (VRN KA32M9988, "Devanand Logistics",
    // SA "Sayeed Jaffer") that appeared on the supervisor floor as if real.
    if (rows.length === 0) return [];

    const nowMs = Date.now();

    // Bay/tech suggestions come from the same real availability logic as
    // generateBayTechRecommendation — never a round-robin B-01/B-02/B-03
    // placeholder pattern. Each row gets its own honest recommendation
    // (or none, if nothing is actually available).
    return Promise.all(rows.map(async (r: any) => {
      const createdAtMs = r.created_at ? new Date(r.created_at).getTime() : nowMs - 3 * 60 * 1000;
      const waitingMins = Math.max(0, Math.floor((nowMs - createdAtMs) / 60000));
      const slaRemainingMins = Math.max(0, 5 - waitingMins);
      const isSlaBreached = waitingMins > 5;
      const complaints = r.authenticated_complaints_json ? JSON.parse(r.authenticated_complaints_json) : [];
      const jobCardId = r.job_card_id || `JC-TEMP-${r.intake_id}`;
      const suggestion = await this.generateBayTechRecommendation(jobCardId, branchId);

      return {
        jobCardId,
        gateEntryId: r.gate_entry_id,
        vosId: r.vos_id || `vos-${r.gate_entry_id}`,
        vrn: r.vrn || "—",
        vehicleModel: r.vehicle_model || "—",
        customerName: r.customer_name || "—",
        saName: r.sa_name || "Unassigned",
        jobType: r.jc_type || "Running Repair",
        complaintCount: complaints.length || 1,
        priority: isSlaBreached ? "HIGH" : "NORMAL",
        isWarranty: r.warranty_prescreen_status === "POTENTIALLY_ELIGIBLE",
        partsDependency: false,
        customerApprovalState: "APPROVED",
        receivedAt: r.created_at || new Date().toISOString(),
        waitingMins,
        slaRemainingMins,
        isSlaBreached,
        suggestedBayId: suggestion?.bayId,
        suggestedTechId: suggestion?.technicianId
      };
    }));
  }

  /**
   * 3. MY BAYS — Real-Time Bay Control
   */
  public async getBaysStatus(branchId: string = "BR-SEDAM"): Promise<BayRosterItem[]> {
    try {
      const [rows] = await db.execute(
        "SELECT * FROM tbl_bays WHERE branch_id = ? ORDER BY bay_id ASC",
        [branchId]
      ) as any[];

      if (rows && rows.length > 0) {
        const nowMs = Date.now();
        return rows.map((b: any) => {
          const occupiedMs = b.occupied_since ? new Date(b.occupied_since).getTime() : 0;
          const elapsedMins = occupiedMs ? Math.floor((nowMs - occupiedMs) / 60000) : 0;
          return {
            bayId: b.bay_id,
            bayName: b.bay_name,
            bayType: b.bay_type,
            lobSuitability: b.lob_suitability,
            status: b.status,
            currentJobCardId: b.current_job_card_id,
            currentVrn: b.current_vrn,
            occupiedSince: b.occupied_since,
            elapsedOccupationMins: elapsedMins,
            currentOperation: b.status === "OCCUPIED" ? "Active Repair WIP" : "Idle",
            isDelayed: elapsedMins > 120
          };
        });
      }
    } catch (e) {}

    return Array.from(this.inMemoryBays.values());
  }

  /**
   * 4. MY TECHNICIANS Roster
   */
  public async getTechniciansRoster(branchId: string = "BR-SEDAM"): Promise<TechRosterItem[]> {
    try {
      const [employees] = await db.execute(
        "SELECT * FROM employees WHERE role IN ('Technician', 'Electrician', 'Mechanic', 'Senior Technician') AND is_active = 1"
      ) as any[];

      if (employees && employees.length > 0) {
        return employees.map((e: any) => ({
          technicianId: `TECH-${e.employee_id}`,
          technicianName: e.full_name,
          role: e.role || "Technician",
          certification: e.qualification || "Bronze",
          lobCompetency: e.department || "ALL",
          status: "AVAILABLE",
          activeWorkload: 0,
          todayProductiveMins: 120
        }));
      }
    } catch (e) {}

    // No technicians on file is an honest empty roster. This used to fall back to
    // three invented technicians (Ravi Kumar / Sanjay Patel / Anand Shinde) who
    // could then be "recommended" and allocated to a real job.
    return [];
  }

  /**
   * 5. AI Bay + Technician Recommendation Engine
   */
  public async generateBayTechRecommendation(
    jobCardId: string,
    branchId: string = "BR-SEDAM"
  ): Promise<AiAllocationSuggestion> {
    const bays = await this.getBaysStatus(branchId);
    const techs = await this.getTechniciansRoster(branchId);

    const availableBay = bays.find(b => b.status === "AVAILABLE") || bays[0];
    const availableTech = techs.find(t => t.status === "AVAILABLE") || techs[0];

    // Nothing to recommend is an honest null — never invent a pairing.
    if (!availableBay || !availableTech) return null as any;

    // State plainly what was matched. This previously claimed the bay was
    // "HCV-compatible" and the technician had the "Lowest active workload" with a
    // 0.94 confidence score — none of which was computed: activeWorkload is not
    // yet tracked, so there is no workload ranking behind the choice.
    return {
      bayId: availableBay.bayId,
      bayName: availableBay.bayName,
      technicianId: availableTech.technicianId,
      technicianName: availableTech.technicianName,
      reason: `First available bay (${availableBay.bayName}) and first available technician (${availableTech.technicianName}). Workload ranking is not yet tracked, so this is availability only — please confirm before allocating.`,
      confidenceScore: null as any
    };
  }

  /**
   * 6. Atomic Job Allocation
   */
  /**
   * Resolve a floor-side job identifier to the real job_card_master row.
   *
   * THE PROBLEM THIS SOLVES: the same vehicle carries two unrelated ids. The
   * SA-intake pipeline mints `DWIP-TEMP-SEDAM-20260908-001`, while
   * job_card_master holds it as `JC-76413`. Every bridge write in this engine
   * matched `job_card_no = ? OR vehicle_reg = ?` against the intake id, so for
   * a DWIP-TEMP vehicle NEITHER side matched: the update touched zero rows and,
   * being wrapped in a logging try/catch, still reported the allocation as a
   * success. KA32AB9690 was allocated to a bay and a technician while
   * job_card_master kept live_status='Unassigned' and assigned_to=NULL, so the
   * technician never saw the job. KA32AB0307 only worked because its intake
   * happened to use a `JC-` id.
   *
   * job_card_master carries no gate_entry_id or intake_id, so the VRN is the
   * only genuine link between the two systems. It is a safe key: vehicle_reg is
   * unique across all job_card_master rows (verified — zero duplicates).
   *
   * Returns the numeric job_card_id, or null when nothing resolves — a null is
   * an honest "no such job card", never a guess.
   */
  private async resolveMasterJobCardId(jobCardId: string): Promise<number | null> {
    // 1. Direct: the caller already gave a real job_card_no or a VRN.
    const [direct]: any = await db.execute(
      `SELECT job_card_id FROM job_card_master
        WHERE job_card_no = ? OR vehicle_reg = ?
        ORDER BY job_card_id DESC LIMIT 1`,
      [jobCardId, jobCardId]
    );
    if (direct?.length) return Number(direct[0].job_card_id);

    // 2. Indirect: a DWIP-TEMP intake id — go intake -> gate entry -> VRN ->
    //    job_card_master. The gate entry holds the plate in `vin`, sometimes
    //    prefixed "VIN-".
    const [viaIntake]: any = await db.execute(
      `SELECT m.job_card_id
         FROM tbl_sa_intake s
         INNER JOIN tbl_gate_entry g ON s.gate_entry_id = g.gate_entry_id
         INNER JOIN job_card_master m ON m.vehicle_reg = TRIM(LEADING 'VIN-' FROM g.vin)
        WHERE s.job_card_id = ?
        ORDER BY m.job_card_id DESC LIMIT 1`,
      [jobCardId]
    );
    if (viaIntake?.length) return Number(viaIntake[0].job_card_id);

    return null;
  }

  public async allocateJobAndBay(
    jobCardId: string,
    bayId: string,
    technicianId: string,
    technicianName: string,
    allocatedBy: string,
    isOverride: boolean = false,
    overrideReason?: string,
    branchId: string = "BR-SEDAM"
  ): Promise<{ success: boolean; allocationId: string }> {
    const bays = await this.getBaysStatus(branchId);
    const targetBay = bays.find(b => b.bayId === bayId);

    if (targetBay && (targetBay.status === "BLOCKED" || targetBay.status === "OUT_OF_SERVICE")) {
      throw new Error(`[FloorExecutionEngine] Bay ${bayId} is currently ${targetBay.status} and cannot be allocated.`);
    }

    // The job card must actually exist. Without this, an orphaned intake (gate
    // entry deleted) could be allocated a bay and a technician — which is
    // exactly what happened to DWIP-TEMP-SEDAM-20260827-001, committing real
    // capacity to a vehicle that is not in the workshop.
    const [jobExists]: any = await db.execute(
      `SELECT 1 FROM job_card_master WHERE job_card_no = ? OR vehicle_reg = ? LIMIT 1`,
      [jobCardId, jobCardId]
    );
    if (!jobExists?.length) {
      const [intakeExists]: any = await db.execute(
        `SELECT 1 FROM tbl_sa_intake s
          INNER JOIN tbl_gate_entry g ON s.gate_entry_id = g.gate_entry_id
          WHERE s.job_card_id = ? LIMIT 1`,
        [jobCardId]
      );
      if (!intakeExists?.length) {
        throw new Error(
          `ALLOCATION_REFUSED: ${jobCardId} has no job card and no live gate entry — there is no vehicle to allocate. This job card appears to be an orphan.`
        );
      }
    }

    // BAY CAPACITY. Physically a bay holds one vehicle, but a second can be
    // parked behind it — so two is the hard ceiling, never more. This was
    // previously unenforced entirely: B-01 accumulated THREE simultaneous
    // ACTIVE allocations, and KA32AA5577 was recorded in four bays at once,
    // because nothing counted what was already there.

    // A vehicle occupies ONE bay. Re-allocating it elsewhere must move it, not
    // clone it into a second bay (which is how KA32AA5577 came to sit in four).
    //
    // Matching on the job_card_id STRING is not enough: the same vehicle can be
    // allocated once as "KA32AB0307" and once as "JC-DevAus-AA1-2627-002178",
    // which is exactly how KA32AB0307 ended up in B-01 and B-02 with two
    // different technicians. So the check resolves every active allocation to
    // its real job_card_master row and compares THAT.
    // NOTE: this deliberately scans EVERY bay, including the target one. An
    // earlier version excluded the target bay (`bay_id <> ?`), which let the
    // same vehicle be allocated into the same bay twice — KA32AB9690 landed in
    // B-01 as both "KA32AB9690" and "DWIP-TEMP-SEDAM-20260908-001", consuming
    // both of that bay's slots with one physical vehicle.
    const incomingMasterId = await this.resolveMasterJobCardId(jobCardId);
    const [activeAnywhere]: any = await db.execute(
      `SELECT allocation_id, bay_id, job_card_id, technician_name FROM tbl_job_allocations
        WHERE branch_id = ? AND status = 'ACTIVE'`,
      [branchId]
    );

    // Resolve each active allocation once; reused by the capacity count below.
    const resolvedByAllocation = new Map<string, number | null>();
    for (const other of activeAnywhere || []) {
      resolvedByAllocation.set(
        String(other.allocation_id),
        await this.resolveMasterJobCardId(String(other.job_card_id))
      );
    }

    for (const other of activeAnywhere || []) {
      const sameString = String(other.job_card_id) === String(jobCardId);
      const sameVehicle =
        incomingMasterId !== null &&
        resolvedByAllocation.get(String(other.allocation_id)) === incomingMasterId;
      if (sameString || sameVehicle) {
        throw new Error(
          `VEHICLE_ALREADY_ALLOCATED: this vehicle is already active in bay ${other.bay_id}` +
            (other.technician_name ? ` with ${other.technician_name}` : "") +
            ` (recorded as "${other.job_card_id}"). Release that allocation before allocating it to ${bayId}.`
        );
      }
    }

    // BAY CAPACITY, counted in PHYSICAL VEHICLES. DISTINCT job_card_id is not
    // the same thing: two allocation rows can name one vehicle under two id
    // formats, which would consume two of the bay's two slots for a single
    // truck. Resolving to job_card_master first collapses those to one.
    const distinctVehicles = new Set<string>();
    for (const other of activeAnywhere || []) {
      if (String(other.bay_id) !== String(bayId)) continue;
      const rid = resolvedByAllocation.get(String(other.allocation_id));
      distinctVehicles.add(rid !== null && rid !== undefined ? `jcm:${rid}` : `raw:${other.job_card_id}`);
    }
    if (distinctVehicles.size >= BAY_MAX_VEHICLES) {
      const names = (activeAnywhere || [])
        .filter((o: any) => String(o.bay_id) === String(bayId))
        .map((o: any) => String(o.job_card_id));
      throw new Error(
        `BAY_AT_CAPACITY: Bay ${bayId} already holds ${distinctVehicles.size} vehicle(s) (${names.join(", ")}). A bay takes at most ${BAY_MAX_VEHICLES} — one in the bay and one parked behind. Free the bay or choose another.`
      );
    }

    // One-active-job enforcement: Junior technicians may hold only one open
    // job at a time; Senior technicians may hold multiple. employee_grade
    // lives on `employees` (default 'Junior'). Checked against job_cards
    // (not tbl_job_allocations) — this is a hard block, unlike the
    // best-effort bridge writes elsewhere in this method. Note:
    // TechnicianWorkspace.tsx now scopes "my jobs" by job_card_master
    // .assigned_to == employee_id (an exact id match, not this name-based
    // check) — this guard is independent of that and stays name-based since
    // job_cards.technician_name is what's actually populated at this point.
    const [gradeRows]: any = await db.execute(
      `SELECT employee_grade FROM employees WHERE employee_id = ? OR full_name = ? LIMIT 1`,
      [technicianId, technicianName]
    );
    const grade = gradeRows?.[0]?.employee_grade || "Junior";
    if (grade !== "Senior") {
      const [openRows]: any = await db.execute(
        `SELECT job_card_no FROM job_cards
          WHERE technician_name = ?
            AND LOWER(status) NOT IN ('completed','delivered','invoiced','cancelled')
          LIMIT 1`,
        [technicianName]
      );
      if (openRows?.length > 0 && String(openRows[0].job_card_no) !== String(jobCardId)) {
        throw new Error(
          `Technician ${technicianName} is Junior grade and already has an open job (${openRows[0].job_card_no}). Junior technicians can only work one job at a time.`
        );
      }
    }

    const allocationId = `ALLOC-${randomUUID().substring(0, 8).toUpperCase()}`;

    // This INSERT is the allocation. It was wrapped in `catch (e) {}`, so a
    // failed write still returned success:true to the supervisor — the exact
    // silent no-op class that has bitten this system repeatedly. It must throw.
    try {
      await db.execute(
        `INSERT INTO tbl_job_allocations 
         (allocation_id, job_card_id, bay_id, technician_id, technician_name, allocated_by, status, is_override, override_reason, branch_id)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        [allocationId, jobCardId, bayId, technicianId, technicianName, allocatedBy, isOverride ? 1 : 0, overrideReason || null, branchId]
      );
    } catch (e: any) {
      console.error("[FloorExecutionEngine] Allocation INSERT failed:", e.message);
      throw new Error(`ALLOCATION_FAILED: the allocation could not be saved (${e.message}). Nothing was allocated.`);
    }

    // The bay row is a derived cache of the allocations above, so a failure
    // here is logged but does not undo a committed allocation.
    try {
      await db.execute(
        "UPDATE tbl_bays SET status = 'OCCUPIED', current_job_card_id = ?, occupied_since = NOW() WHERE bay_id = ?",
        [jobCardId, bayId]
      );
    } catch (e: any) {
      console.error("[FloorExecutionEngine] Failed to mark bay occupied:", e.message);
    }

    // Create the technician's work item. NOTHING in this codebase ever
    // INSERTed into tbl_repair_executions — startRepairTimer/pause/resume/
    // complete all UPDATE rows that were never created, so the table is empty
    // and no technician timer has ever run. The row starts NOT_STARTED: the
    // technician must accept/start it, and only then does the clock begin.
    const executionId = `EXEC-${randomUUID().substring(0, 8).toUpperCase()}`;
    try {
      await db.execute(
        `INSERT INTO tbl_repair_executions
          (execution_id, job_card_id, technician_id, technician_name, bay_id, status, branch_id)
         VALUES (?, ?, ?, ?, ?, 'NOT_STARTED', ?)`,
        [executionId, jobCardId, technicianId, technicianName, bayId, branchId]
      );
    } catch (e: any) {
      console.error("[FloorExecutionEngine] Failed to create repair execution:", e.message);
    }

    // Update in-memory state
    if (targetBay) {
      targetBay.status = "OCCUPIED";
      targetBay.currentJobCardId = jobCardId;
      targetBay.occupiedSince = new Date().toISOString();
      this.inMemoryBays.set(bayId, targetBay);
    }

    this.inMemoryAllocations.set(allocationId, {
      allocationId, jobCardId, bayId, technicianId, technicianName, allocatedBy, isOverride, overrideReason, branchId
    });

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-${jobCardId}`,
        timelineType: "OPERATIONAL",
        eventType: "FLOOR_JOB_ALLOCATED",
        title: `Job ${jobCardId} Allocated to Bay ${bayId} & Tech ${technicianName}`,
        metadata: { allocationId, bayId, technicianId, technicianName, isOverride, overrideReason }
      });
    } catch (e) {}

    // Bridge into job_card_master/job_cards (the app-wide record every other
    // screen reads) so the technician's workspace picks this job up. jobCardId
    // here may be a real job_card_no or a bare VRN — match on either,
    // best-effort: never fail the (already-committed) allocation on this.
    // job_card_master has no workshop_stage/technician_name columns — its
    // stage analog is `live_status` (syncLoad() already maps live_status back
    // to workshop_stage in-memory); job_cards is the table that genuinely
    // carries workshop_stage/technician_name directly.
    // Resolved by id, not by string-matching two incompatible id formats.
    const masterId = await this.resolveMasterJobCardId(jobCardId);
    if (masterId === null) {
      console.error(
        `[FloorExecutionEngine] No job_card_master row resolves for ${jobCardId}. ` +
          `The allocation is saved but the technician's workspace will NOT show it.`
      );
    }
    try {
      if (masterId !== null) {
        // live_status AND assigned_to in one write, keyed on the primary key,
        // so a zero-row result can only mean the row vanished.
        // NOTE: job_card_master.bay_id is `int unsigned`, but bay ids are
        // strings ("B-01"). It is deliberately NOT written here — the bay
        // belongs to tbl_job_allocations and tbl_bays, which hold it correctly
        // as a string. Writing "B-01" into an int column would coerce to 0 and
        // record a bay that does not exist.
        const techEmployeeId = Number(String(technicianId).replace(/^TECH-/i, ""));
        const [upd]: any = Number.isNaN(techEmployeeId)
          ? await db.execute(
              `UPDATE job_card_master SET live_status = 'FLOOR_ALLOCATED' WHERE job_card_id = ?`,
              [masterId]
            )
          : await db.execute(
              `UPDATE job_card_master SET live_status = 'FLOOR_ALLOCATED', assigned_to = ?
                WHERE job_card_id = ?`,
              [techEmployeeId, masterId]
            );
        if (!upd?.affectedRows) {
          console.error(`[FloorExecutionEngine] job_card_master ${masterId} matched 0 rows on allocation bridge.`);
        }
      }
      // job_cards is the legacy table; many vehicles have no row in it at all,
      // so a zero-row result here is expected and not an error.
      await db.execute(
        `UPDATE job_cards SET workshop_stage = 'FLOOR_ALLOCATED', technician_name = ?
          WHERE job_card_no = ? OR vrn = ?
          ORDER BY created_at DESC LIMIT 1`,
        [technicianName, jobCardId, jobCardId]
      );
    } catch (e: any) {
      console.error("[FloorExecutionEngine] Failed to bridge allocation into job cards:", e.message);
    }

    // Advance tbl_sa_intake past the status getFloorPendingQueue() filters on
    // ('SENT_TO_FLOOR') so an allocated job actually leaves the pending queue
    // instead of staying there forever regardless of how many times it's
    // processed. 'FLOOR_ALLOCATED' is outside that filter, which is the point.
    try {
      await db.execute(
        `UPDATE tbl_sa_intake SET status = 'FLOOR_ALLOCATED' WHERE job_card_id = ?`,
        [jobCardId]
      );
    } catch (e: any) {
      console.error("[FloorExecutionEngine] Failed to advance tbl_sa_intake status:", e.message);
    }

    return { success: true, allocationId };
  }

  /**
   * 7. Technician "MY WORK" Queue
   */
  public async getTechnicianWork(technicianId: string): Promise<{
    currentJob: any | null;
    nextJobs: any[];
    completedToday: any[];
  }> {
    let rows: any[] = [];
    try {
      const [dbRows] = await db.execute(
        `SELECT e.*, a.bay_id, a.allocated_by 
         FROM tbl_repair_executions e
         LEFT JOIN tbl_job_allocations a ON e.job_card_id = a.job_card_id
         WHERE e.technician_id = ?
         ORDER BY e.started_at DESC`,
        [technicianId]
      ) as any[];
      rows = dbRows || [];
    } catch (e) {}

    if (rows.length === 0) {
      const inMem = Array.from(this.inMemoryExecutions.values()).filter(e => e.technician_id === technicianId);
      rows = inMem;
    }

    const currentJob = rows.find((r: any) => r.status === "IN_PROGRESS" || r.status === "PAUSED") || rows[0] || null;
    const nextJobs = rows.filter((r: any) => r.status === "NOT_STARTED");
    const completedToday = rows.filter((r: any) => r.status === "COMPLETED");

    return { currentJob, nextJobs, completedToday };
  }

  /**
   * 8. Real-Time Operation Timers: START JOB
   */
  public async startRepairTimer(
    executionId: string,
    technicianId: string
  ): Promise<{ success: boolean; startedAt: string }> {
    const now = new Date().toISOString();

    // ACCEPT GATE. A technician may hold several allocated jobs, but the SLA
    // clock must not run on work he has not picked up — otherwise a job
    // allocated at 09:00 and physically started at 14:00 is judged as five
    // hours late through no fault of his. Starting here IS the acceptance, and
    // started_at is the only point the clock begins.
    //
    // This UPDATE was previously wrapped in `catch (e) {}` against a table that
    // nothing ever INSERTed into, so it matched zero rows every time and still
    // reported success — no technician timer has ever actually run.
    const [execRows]: any = await db.execute(
      `SELECT execution_id, job_card_id, technician_id, status, started_at
         FROM tbl_repair_executions WHERE execution_id = ? LIMIT 1`,
      [executionId]
    );
    const row = execRows?.[0];
    if (!row) {
      throw new Error(`EXECUTION_NOT_FOUND: No work item ${executionId}. It cannot be started.`);
    }
    // Only the assigned technician accepts his own work.
    const rowTech = String(row.technician_id ?? "");
    const actor = String(technicianId ?? "");
    const actorTech = actor.replace(/^TECH-/i, "");
    if (rowTech && actor && rowTech !== actor && rowTech.replace(/^TECH-/i, "") !== actorTech) {
      throw new Error(
        `NOT_YOUR_JOB: ${executionId} is allocated to ${row.technician_id}, not to you. Only the assigned technician can start it.`
      );
    }
    if (row.status === "IN_PROGRESS") {
      throw new Error(`ALREADY_STARTED: ${executionId} is already running (started ${row.started_at}).`);
    }
    if (row.status === "COMPLETED") {
      throw new Error(`ALREADY_COMPLETED: ${executionId} is finished and cannot be restarted.`);
    }

    try {
      const [upd]: any = await db.execute(
        `UPDATE tbl_repair_executions
            SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, NOW())
          WHERE execution_id = ? AND status IN ('NOT_STARTED','PAUSED')`,
        [executionId]
      );
      if (!upd?.affectedRows) {
        throw new Error(`START_FAILED: ${executionId} could not be started; its state changed. Nothing was started.`);
      }
    } catch (e: any) {
      console.error("[FloorExecutionEngine] startRepairTimer failed:", e.message);
      throw e;
    }

    const exec = this.inMemoryExecutions.get(executionId) || { execution_id: executionId, technician_id: technicianId };
    exec.status = "IN_PROGRESS";
    exec.started_at = now;
    this.inMemoryExecutions.set(executionId, exec);

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-exec-${executionId}`,
        timelineType: "OPERATIONAL",
        eventType: "REPAIR_STARTED",
        title: `Repair Operation Started`,
        metadata: { executionId, technicianId, startedAt: now }
      });
    } catch (e) {}

    return { success: true, startedAt: now };
  }

  /**
   * 9. Real-Time Operation Timers: PAUSE JOB
   */
  public async pauseRepairTimer(
    executionId: string,
    technicianId: string,
    pauseReason: string
  ): Promise<{ success: boolean; pausedAt: string }> {
    const now = new Date().toISOString();

    try {
      await db.execute(
        "UPDATE tbl_repair_executions SET status = 'PAUSED', paused_at = NOW(), pause_reason = ? WHERE execution_id = ?",
        [pauseReason, executionId]
      );
    } catch (e) {}

    const exec = this.inMemoryExecutions.get(executionId) || { execution_id: executionId, technician_id: technicianId };
    exec.status = "PAUSED";
    exec.paused_at = now;
    exec.pause_reason = pauseReason;
    this.inMemoryExecutions.set(executionId, exec);

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-exec-${executionId}`,
        timelineType: "OPERATIONAL",
        eventType: "REPAIR_PAUSED",
        title: `Repair Operation Paused: ${pauseReason}`,
        metadata: { executionId, technicianId, pauseReason, pausedAt: now }
      });
    } catch (e) {}

    return { success: true, pausedAt: now };
  }

  /**
   * 10. Real-Time Operation Timers: RESUME JOB
   */
  public async resumeRepairTimer(
    executionId: string,
    technicianId: string
  ): Promise<{ success: boolean; resumedAt: string }> {
    const now = new Date().toISOString();

    try {
      await db.execute(
        "UPDATE tbl_repair_executions SET status = 'IN_PROGRESS', paused_at = NULL WHERE execution_id = ?",
        [executionId]
      );
    } catch (e) {}

    const exec = this.inMemoryExecutions.get(executionId) || { execution_id: executionId, technician_id: technicianId };
    exec.status = "IN_PROGRESS";
    exec.paused_at = null;
    this.inMemoryExecutions.set(executionId, exec);

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-exec-${executionId}`,
        timelineType: "OPERATIONAL",
        eventType: "REPAIR_RESUMED",
        title: `Repair Operation Resumed`,
        metadata: { executionId, technicianId, resumedAt: now }
      });
    } catch (e) {}

    return { success: true, resumedAt: now };
  }

  /**
   * 11. Parallel Workstream: PART REQUIRED
   */
  public async raisePartsRequest(
    jobCardId: string,
    vrn: string,
    operationId: string,
    partDescription: string,
    quantity: number,
    urgency: string,
    requestedBy: string,
    branchId: string = "BR-SEDAM"
  ): Promise<{ success: boolean; requestId: string }> {
    const requestId = `PR-${randomUUID().substring(0, 8).toUpperCase()}`;

    try {
      await db.execute(
        `INSERT INTO tbl_parts_requests 
         (request_id, job_card_id, vrn, operation_id, part_description, quantity, urgency, requested_by, status, branch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
        [requestId, jobCardId, vrn, operationId, partDescription, quantity, urgency, requestedBy, branchId]
      );
    } catch (e) {}

    this.inMemoryPartsRequests.set(requestId, {
      requestId, jobCardId, vrn, operationId, partDescription, quantity, urgency, requestedBy, status: "PENDING", branchId, delay_reason: "WAITING_PARTS", waiting_on: requestedBy, delay_start: new Date().toISOString()
    });

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-${jobCardId}`,
        timelineType: "OPERATIONAL",
        eventType: "PARTS_REQUESTED",
        title: `Parts Requested: ${partDescription} (x${quantity})`,
        metadata: { requestId, jobCardId, partDescription, quantity, urgency, requestedBy }
      });
    } catch (e) {}

    return { success: true, requestId };
  }

  /**
   * 11b. Parts requests raised for a job — for the technician's own screen to
   * see acknowledge/fulfil status inline, and to report the workshop's
   * 15-minute query/issue TAT (requested_at -> acknowledged_at -> fulfilled_at).
   */
  public async getPartsRequestsForJob(jobCardId: string): Promise<any[]> {
    try {
      const [rows] = await db.execute(
        `SELECT request_id, part_description, quantity, urgency, status,
                requested_at, acknowledged_at, fulfilled_at
           FROM tbl_parts_requests
          WHERE job_card_id = ?
          ORDER BY requested_at DESC`,
        [jobCardId]
      ) as any[];
      return rows || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 12. Parallel Workstream: WARRANTY REVIEW
   */
  public async raiseWarrantyReview(
    jobCardId: string,
    vrn: string,
    vin: string,
    complaint: string,
    diagnosis: string,
    failedPart: string,
    requestedBy: string,
    branchId: string = "BR-SEDAM"
  ): Promise<{ success: boolean; reviewId: string }> {
    const reviewId = `WR-${randomUUID().substring(0, 8).toUpperCase()}`;

    try {
      await db.execute(
        `INSERT INTO tbl_warranty_reviews
         (review_id, job_card_id, vrn, vin, complaint, diagnosis, failed_part, requested_by, status, branch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
        [reviewId, jobCardId, vrn, vin, complaint, diagnosis, failedPart, requestedBy, branchId]
      );
    } catch (e) {}

    this.inMemoryWarrantyReviews.set(reviewId, {
      reviewId, jobCardId, vrn, vin, complaint, diagnosis, failedPart, requestedBy, status: "PENDING", branchId, delay_reason: "WAITING_WARRANTY", waiting_on: requestedBy, delay_start: new Date().toISOString()
    });

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-${jobCardId}`,
        timelineType: "OPERATIONAL",
        eventType: "WARRANTY_REVIEW_RAISED",
        title: `Warranty Referral Raised for Part ${failedPart}`,
        metadata: { reviewId, jobCardId, failedPart, requestedBy }
      });
    } catch (e) {}

    return { success: true, reviewId };
  }

  /**
   * 13. ADDITIONAL FINDINGS -> SA Notification
   */
  public async raiseAdditionalFinding(
    jobCardId: string,
    vrn: string,
    findingText: string,
    recommendedWork: string,
    requiredPart: string,
    estimatedAdditionalMins: number,
    requiresCustomerApproval: boolean,
    identifiedBy: string,
    branchId: string = "BR-SEDAM"
  ): Promise<{ success: boolean; findingId: string }> {
    const findingId = `AF-${randomUUID().substring(0, 8).toUpperCase()}`;

    try {
      await db.execute(
        `INSERT INTO tbl_additional_findings
         (finding_id, job_card_id, vrn, finding_text, recommended_work, required_part, estimated_additional_mins, requires_customer_approval, approval_status, identified_by, branch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
        [findingId, jobCardId, vrn, findingText, recommendedWork, requiredPart, estimatedAdditionalMins, requiresCustomerApproval ? 1 : 0, identifiedBy, branchId]
      );
    } catch (e) {}

    this.inMemoryAdditionalFindings.set(findingId, {
      findingId, jobCardId, vrn, findingText, recommendedWork, requiredPart, estimatedAdditionalMins, requiresCustomerApproval, approval_status: "PENDING", identifiedBy, branchId, delay_reason: "WAITING_CUSTOMER_APPROVAL", waiting_on: identifiedBy, delay_start: new Date().toISOString()
    });

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-${jobCardId}`,
        timelineType: "OPERATIONAL",
        eventType: "ADDITIONAL_FINDING_RAISED",
        title: `Additional Finding Raised: ${findingText}`,
        metadata: { findingId, jobCardId, findingText, requiresCustomerApproval }
      });
    } catch (e) {}

    return { success: true, findingId };
  }

  /**
   * 14. ETA Extension Governance
   */
  public async requestEtaExtension(
    jobCardId: string,
    oldEta: string,
    newEta: string,
    reason: string,
    requestedBy: string,
    extensionCount: number = 1,
    branchId: string = "BR-SEDAM"
  ): Promise<{ success: boolean; extensionId: string; approvalLevel: "NORMAL" | "WORKS_MANAGER" | "GM" }> {
    const oldMs = new Date(oldEta).getTime();
    const newMs = new Date(newEta).getTime();
    const excessMinutes = Math.max(0, Math.floor((newMs - oldMs) / 60000));

    let approvalLevel: "NORMAL" | "WORKS_MANAGER" | "GM" = "NORMAL";
    if (excessMinutes > 120 || extensionCount >= 3) {
      approvalLevel = "GM";
    } else if (excessMinutes > 60) {
      approvalLevel = "WORKS_MANAGER";
    }

    const extensionId = `ETA-EXT-${randomUUID().substring(0, 8).toUpperCase()}`;

    try {
      await db.execute(
        `INSERT INTO tbl_eta_extensions
         (extension_id, job_card_id, old_eta, new_eta, excess_minutes, reason, requested_by, approval_level, status, extension_count, branch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
        [extensionId, jobCardId, new Date(oldEta), new Date(newEta), excessMinutes, reason, requestedBy, approvalLevel, extensionCount, branchId]
      );
    } catch (e) {}

    this.inMemoryEtaExtensions.set(extensionId, {
      extension_id: extensionId, extensionId, job_card_id: jobCardId, old_eta: oldEta, new_eta: newEta, excess_minutes: excessMinutes, reason, requested_by: requestedBy, approval_level: approvalLevel, status: "PENDING", extension_count: extensionCount, branch_id: branchId
    });

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-${jobCardId}`,
        timelineType: "OPERATIONAL",
        eventType: "ETA_EXTENSION_REQUESTED",
        title: `ETA Extension Requested (+${excessMinutes}m)`,
        metadata: { extensionId, jobCardId, excessMinutes, approvalLevel, requestedBy }
      });
    } catch (e) {}

    return { success: true, extensionId, approvalLevel };
  }

  /**
   * 15. ETA Extension Approval Governance
   */
  public async approveEtaExtension(
    extensionId: string,
    approverId: string,
    approverRole: string
  ): Promise<{ success: boolean }> {
    let ext: any = null;

    try {
      const [rows] = await db.execute(
        "SELECT * FROM tbl_eta_extensions WHERE extension_id = ?",
        [extensionId]
      ) as any[];
      if (rows && rows.length > 0) ext = rows[0];
    } catch (e) {}

    if (!ext) {
      ext = this.inMemoryEtaExtensions.get(extensionId);
    }

    if (!ext) {
      throw new Error(`[FloorExecutionEngine] ETA Extension ${extensionId} not found.`);
    }

    const roleLower = approverRole.toLowerCase();

    if (ext.approval_level === "GM" && !["general_manager", "gm", "admin"].includes(roleLower)) {
      throw new Error(`[FloorExecutionEngine] Excess >2h or 3rd extension requires GM approval. User role ${approverRole} rejected.`);
    }

    if (ext.approval_level === "WORKS_MANAGER" && !["works_manager", "service_manager", "general_manager", "gm", "admin"].includes(roleLower)) {
      throw new Error(`[FloorExecutionEngine] Excess >1h requires Works Manager approval. User role ${approverRole} rejected.`);
    }

    try {
      await db.execute(
        "UPDATE tbl_eta_extensions SET status = 'APPROVED', approved_by = ?, approved_at = NOW() WHERE extension_id = ?",
        [approverId, extensionId]
      );
    } catch (e) {}

    ext.status = "APPROVED";
    ext.approved_by = approverId;
    ext.approved_at = new Date().toISOString();
    this.inMemoryEtaExtensions.set(extensionId, ext);

    return { success: true };
  }

  /**
   * 16. Consolidated Operational Exceptions Queue (MY DELAYS)
   */
  public async getFloorDelaysQueue(branchId: string = "BR-SEDAM"): Promise<any[]> {
    let partsRows: any[] = [];
    let warrantyRows: any[] = [];
    let findingsRows: any[] = [];

    try {
      const [p] = await db.execute(
        "SELECT request_id as id, vrn, job_card_id, 'WAITING_PARTS' as delay_reason, requested_by as waiting_on, requested_at as delay_start FROM tbl_parts_requests WHERE branch_id = ? AND status = 'PENDING'",
        [branchId]
      ) as any[];
      partsRows = p || [];

      const [w] = await db.execute(
        "SELECT review_id as id, vrn, job_card_id, 'WAITING_WARRANTY' as delay_reason, requested_by as waiting_on, requested_at as delay_start FROM tbl_warranty_reviews WHERE branch_id = ? AND status = 'PENDING'",
        [branchId]
      ) as any[];
      warrantyRows = w || [];

      const [f] = await db.execute(
        "SELECT finding_id as id, vrn, job_card_id, 'WAITING_CUSTOMER_APPROVAL' as delay_reason, identified_by as waiting_on, identified_at as delay_start FROM tbl_additional_findings WHERE branch_id = ? AND approval_status = 'PENDING'",
        [branchId]
      ) as any[];
      findingsRows = f || [];
    } catch (e) {}

    if (partsRows.length === 0) {
      partsRows = Array.from(this.inMemoryPartsRequests.values()).filter(p => p.status === "PENDING");
    }
    if (warrantyRows.length === 0) {
      warrantyRows = Array.from(this.inMemoryWarrantyReviews.values()).filter(w => w.status === "PENDING");
    }
    if (findingsRows.length === 0) {
      findingsRows = Array.from(this.inMemoryAdditionalFindings.values()).filter(f => f.approval_status === "PENDING");
    }

    const nowMs = Date.now();
    const combine = [...partsRows, ...warrantyRows, ...findingsRows].map((r: any) => {
      const startMs = r.delay_start ? new Date(r.delay_start).getTime() : nowMs - 15 * 60 * 1000;
      return {
        ...r,
        elapsedDelayMins: Math.floor((nowMs - startMs) / 60000)
      };
    });

    return combine;
  }

  /**
   * 17. Technician Job Completion
   */
  public async completeTechnicianJob(
    executionId: string,
    technicianId: string
  ): Promise<{ success: boolean; completedAt: string }> {
    const now = new Date().toISOString();

    try {
      await db.execute(
        "UPDATE tbl_repair_executions SET status = 'COMPLETED', completed_at = NOW() WHERE execution_id = ?",
        [executionId]
      );
    } catch (e) {}

    const exec = this.inMemoryExecutions.get(executionId) || { execution_id: executionId, technician_id: technicianId };
    exec.status = "COMPLETED";
    exec.completed_at = now;
    this.inMemoryExecutions.set(executionId, exec);

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-exec-${executionId}`,
        timelineType: "OPERATIONAL",
        eventType: "TECHNICIAN_JOB_COMPLETED",
        title: `Technician Completed Repair`,
        metadata: { executionId, technicianId, completedAt: now }
      });
    } catch (e) {}

    return { success: true, completedAt: now };
  }

  /**
   * 18. Floor Completion Validation Gate before QC Handoff
   */
  public async validateFloorCompletionGate(jobCardId: string): Promise<{ isReady: boolean; blockingItems: string[] }> {
    const blockingItems: string[] = [];

    // Check open parts requests
    let openPartsCount = 0;
    try {
      const [openParts] = await db.execute(
        "SELECT COUNT(*) as cnt FROM tbl_parts_requests WHERE job_card_id = ? AND status = 'PENDING'",
        [jobCardId]
      ) as any[];
      openPartsCount = openParts[0]?.cnt || 0;
    } catch (e) {
      openPartsCount = Array.from(this.inMemoryPartsRequests.values()).filter(p => p.jobCardId === jobCardId && p.status === "PENDING").length;
    }

    if (openPartsCount > 0) {
      blockingItems.push("Unresolved Parts Requests pending fulfilment");
    }

    // Check open customer approval findings
    let openApprovalCount = 0;
    try {
      const [openApproval] = await db.execute(
        "SELECT COUNT(*) as cnt FROM tbl_additional_findings WHERE job_card_id = ? AND requires_customer_approval = 1 AND approval_status = 'PENDING'",
        [jobCardId]
      ) as any[];
      openApprovalCount = openApproval[0]?.cnt || 0;
    } catch (e) {
      openApprovalCount = Array.from(this.inMemoryAdditionalFindings.values()).filter(f => f.jobCardId === jobCardId && f.requiresCustomerApproval && f.approval_status === "PENDING").length;
    }

    if (openApprovalCount > 0) {
      blockingItems.push("Additional findings awaiting Customer Approval");
    }

    return {
      isReady: blockingItems.length === 0,
      blockingItems
    };
  }

  /**
   * 19. Atomic QC Handoff & 5-minute QC SLA
   */
  public async handoffToQc(
    jobCardId: string,
    vrn: string,
    floorInchargeId: string,
    qcInchargeId: string = "QC-INCHARGE-01",
    branchId: string = "BR-SEDAM"
  ): Promise<{ success: boolean; handoffId: string }> {
    const gateCheck = await this.validateFloorCompletionGate(jobCardId);
    if (!gateCheck.isReady) {
      throw new Error(`[FloorExecutionEngine] Cannot handoff to QC: ${gateCheck.blockingItems.join(", ")}`);
    }

    const handoffId = `QC-HANDOFF-${randomUUID().substring(0, 8).toUpperCase()}`;

    try {
      await db.execute(
        `INSERT INTO tbl_qc_handoff
         (handoff_id, job_card_id, vrn, floor_incharge_id, qc_incharge_id, validation_status, status, branch_id)
         VALUES (?, ?, ?, ?, ?, 'PASSED', 'PENDING_QC', ?)`,
        [handoffId, jobCardId, vrn, floorInchargeId, qcInchargeId, branchId]
      );

      await db.execute(
        "UPDATE tbl_bays SET status = 'AVAILABLE', current_job_card_id = NULL, current_vrn = NULL WHERE current_job_card_id = ?",
        [jobCardId]
      );
    } catch (e) {}

    // Create 5-minute QC Handoff SLA
    await this.createHandoffSla(
      "SLA_FLOOR_TO_QC",
      jobCardId,
      qcInchargeId,
      "qc_incharge",
      5,
      branchId
    );

    this.inMemoryQcHandoffs.set(handoffId, { handoffId, jobCardId, vrn, floorInchargeId, qcInchargeId, status: "PENDING_QC", branchId });

    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-${jobCardId}`,
        timelineType: "OPERATIONAL",
        eventType: "READY_FOR_QC",
        title: `Floor Execution Completed — Vehicle Ready for QC`,
        metadata: { handoffId, jobCardId, floorInchargeId, qcInchargeId }
      });
    } catch (e) {}

    // Bridge into job_card_master/job_cards so QCInspectorWorkspace's own
    // stage-based relevance (jobcard-relevance.ts) picks this job up.
    // Best-effort: never fail the (already-committed) handoff on this.
    // job_card_master has no workshop_stage column — its analog is
    // `live_status` (see the allocateJobAndBay bridge above for the same fix).
    try {
      // Same two-id-systems defect as the allocation bridge: a DWIP-TEMP intake
      // id matches neither job_card_no nor vehicle_reg, so this silently
      // updated zero rows and QC never saw the vehicle.
      const qcMasterId = await this.resolveMasterJobCardId(jobCardId);
      if (qcMasterId !== null) {
        await db.execute(
          `UPDATE job_card_master SET live_status = 'QC_PENDING' WHERE job_card_id = ?`,
          [qcMasterId]
        );
      } else {
        console.error(
          `[FloorExecutionEngine] No job_card_master row resolves for ${jobCardId} on QC handoff; QC will not see it.`
        );
      }
      await db.execute(
        `UPDATE job_cards SET workshop_stage = 'QC_PENDING'
          WHERE job_card_no = ? OR vrn = ?
          ORDER BY created_at DESC LIMIT 1`,
        [jobCardId, vrn || jobCardId]
      );
    } catch (e: any) {
      console.error("[FloorExecutionEngine] Failed to bridge QC handoff into job_cards:", e.message);
    }

    return { success: true, handoffId };
  }
}

export const floorExecutionEngine = FloorExecutionEngine.getInstance();
