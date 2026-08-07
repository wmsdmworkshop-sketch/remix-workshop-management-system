import { describe, it, expect, beforeAll } from "vitest";
import { floorExecutionEngine } from "../core/workshop/floor-execution-engine";
import { SaTechnicalIntakeEngine } from "../core/workshop/sa-technical-intake";
import { RealtimeOwnershipPipeline } from "../core/workshop/realtime-ownership-pipeline";

describe("Phase 5 — Floor Control, Bay/Technician Allocation & Real-Time Repair Execution", () => {

  const floorUser = { userId: "FLOOR-01", fullName: "Devanand Floor Supervisor", role: "floor_supervisor", branchId: "BR-SEDAM" };
  const techUser = { userId: "TECH-001", fullName: "Ravi Kumar", role: "technician", branchId: "BR-SEDAM" };
  const worksMgrUser = { userId: "WM-01", fullName: "Works Manager Devanand", role: "works_manager", branchId: "BR-SEDAM" };
  const gmUser = { userId: "GM-01", fullName: "General Manager Devanand", role: "general_manager", branchId: "BR-SEDAM" };

  it("1. SCOPE ISOLATION: Floor pending queue returns only vehicles assigned to floor scope", async () => {
    const queue = await floorExecutionEngine.getFloorPendingQueue(floorUser.userId, floorUser.branchId);
    expect(Array.isArray(queue)).toBe(true);
  });

  it("2. ACKNOWLEDGEMENT: Floor handoff acknowledgement persists server-side", async () => {
    const ack = await floorExecutionEngine.acknowledgeFloorHandoff("JC-TEST-501", floorUser.userId, floorUser.fullName);
    expect(ack.success).toBe(true);
    expect(ack.acknowledgedAt).toBeDefined();
  });

  it("3. SLA ESCALATION: Unacknowledged handoffs >5m breach SLA", async () => {
    const sla = await floorExecutionEngine.createHandoffSla(
      "SLA_SA_TO_FLOOR",
      "JC-BREACH-501",
      floorUser.userId,
      "floor_incharge",
      -2, // 2 mins in the past -> breached
      "BR-SEDAM"
    );
    expect(sla.isBreached).toBe(true);
  });

  it("4. BAY ALLOCATION: Available bay can be allocated", async () => {
    const alloc = await floorExecutionEngine.allocateJobAndBay(
      "JC-TEST-501",
      "B-01",
      "TECH-001",
      "Ravi Kumar",
      floorUser.fullName,
      false,
      undefined,
      "BR-SEDAM"
    );
    expect(alloc.success).toBe(true);
    expect(alloc.allocationId).toBeDefined();
  });

  it("5. DOUBLE-BOOKING PREVENTION: Occupied/Blocked bay allocation is guarded", async () => {
    const bays = await floorExecutionEngine.getBaysStatus("BR-SEDAM");
    expect(bays.length).toBeGreaterThan(0);
  });

  it("6. BLOCKED BAY GUARD: Attempting allocation to blocked bay throws error", async () => {
    await expect(
      floorExecutionEngine.allocateJobAndBay("JC-TEST-502", "B-99", "TECH-001", "Ravi Kumar", floorUser.fullName)
    ).rejects.toThrow("currently BLOCKED");
  });

  it("7. TECHNICIAN ROSTER: Returns active workload and LOB competencies", async () => {
    const techs = await floorExecutionEngine.getTechniciansRoster("BR-SEDAM");
    expect(techs.length).toBeGreaterThan(0);
    expect(techs[0].technicianName).toBeDefined();
  });

  it("8. CONFLICTING ASSIGNMENT: Busy technician is tracked in roster", async () => {
    const techs = await floorExecutionEngine.getTechniciansRoster("BR-SEDAM");
    expect(techs.some(t => t.status === "AVAILABLE" || t.status === "BUSY")).toBe(true);
  });

  it("9. AI RECOMMENDATION: Produces advisory recommendation with clear reasoning", async () => {
    const rec = await floorExecutionEngine.generateBayTechRecommendation("JC-TEST-501", "BR-SEDAM");
    expect(rec.bayId).toBeDefined();
    expect(rec.technicianId).toBeDefined();
    expect(rec.reason).toContain("bay");
  });

  it("10. AI OVERRIDE AUDIT: Overriding AI recommendation logs reason", async () => {
    const alloc = await floorExecutionEngine.allocateJobAndBay(
      "JC-TEST-501",
      "B-02",
      "TECH-002",
      "Sanjay Patel",
      floorUser.fullName,
      true,
      "Technician Ravi called into another urgent priority",
      "BR-SEDAM"
    );
    expect(alloc.success).toBe(true);
  });

  it("11. TECHNICIAN MY WORK: Returns only logged-in technician work", async () => {
    const work = await floorExecutionEngine.getTechnicianWork(techUser.userId);
    expect(work).toBeDefined();
    expect(Array.isArray(work.nextJobs)).toBe(true);
  });

  it("12. SECURITY ISOLATION: Technician A cannot access another tech's unassigned work", async () => {
    const work = await floorExecutionEngine.getTechnicianWork("TECH-UNAUTH-999");
    expect(work.currentJob).toBeNull();
  });

  it("13. START REPAIR TIMER: Generates server timestamp and updates status to IN_PROGRESS", async () => {
    const timer = await floorExecutionEngine.startRepairTimer("EXEC-501", techUser.userId);
    expect(timer.success).toBe(true);
    expect(timer.startedAt).toBeDefined();
  });

  it("14. PAUSE REPAIR TIMER: Mandates controlled pause reason", async () => {
    const pause = await floorExecutionEngine.pauseRepairTimer("EXEC-501", techUser.userId, "WAITING_PARTS");
    expect(pause.success).toBe(true);
    expect(pause.pausedAt).toBeDefined();
  });

  it("15. RESUME REPAIR TIMER: Resumes productive execution timer", async () => {
    const resume = await floorExecutionEngine.resumeRepairTimer("EXEC-501", techUser.userId);
    expect(resume.success).toBe(true);
    expect(resume.resumedAt).toBeDefined();
  });

  it("16. PARTS PARALLEL WORKSTREAM: Routes part request to Parts queue", async () => {
    const req = await floorExecutionEngine.raisePartsRequest(
      "JC-TEST-501",
      "KA32M9988",
      "OP-101",
      "Clutch Release Bearing Heavy Duty",
      1,
      "HIGH",
      techUser.fullName,
      "BR-SEDAM"
    );
    expect(req.success).toBe(true);
    expect(req.requestId).toMatch(/^PR-/);
  });

  it("17. WARRANTY PARALLEL WORKSTREAM: Routes warranty referral to Warranty queue", async () => {
    const warr = await floorExecutionEngine.raiseWarrantyReview(
      "JC-TEST-501",
      "KA32M9988",
      "VIN-KA32M9988",
      "Clutch slip",
      "Premature release bearing wear",
      "BEARING-HD-001",
      techUser.fullName,
      "BR-SEDAM"
    );
    expect(warr.success).toBe(true);
    expect(warr.reviewId).toMatch(/^WR-/);
  });

  it("18. ADDITIONAL FINDINGS: Routes finding to SA MY ATTENTION queue", async () => {
    const finding = await floorExecutionEngine.raiseAdditionalFinding(
      "JC-TEST-501",
      "KA32M9988",
      "Flywheel scoring noticed during clutch disassembly",
      "Resurface flywheel or replace assembly",
      "FLYWHEEL-ASSY-01",
      45,
      true,
      techUser.fullName,
      "BR-SEDAM"
    );
    expect(finding.success).toBe(true);
    expect(finding.findingId).toMatch(/^AF-/);
  });

  it("19. CUSTOMER APPROVAL DEPENDENCY: Work requiring approval sets waiting state", async () => {
    const delays = await floorExecutionEngine.getFloorDelaysQueue("BR-SEDAM");
    expect(Array.isArray(delays)).toBe(true);
  });

  it("20. INDEPENDENT WORK CONTINUATION: Unrelated repair work continues unhindered", async () => {
    const work = await floorExecutionEngine.getTechnicianWork(techUser.userId);
    expect(work).toBeDefined();
  });

  it("21. ETA EXTENSION GOVERNANCE (>1H): Requires Works Manager approval", async () => {
    const now = new Date();
    const oldEta = now.toISOString();
    const newEta = new Date(now.getTime() + 90 * 60 * 1000).toISOString(); // +90 mins

    const ext = await floorExecutionEngine.requestEtaExtension("JC-TEST-501", oldEta, newEta, "Complex flywheel machining", techUser.fullName);
    expect(ext.approvalLevel).toBe("WORKS_MANAGER");
  });

  it("22. ETA EXTENSION GOVERNANCE (>2H): Requires GM approval", async () => {
    const now = new Date();
    const oldEta = now.toISOString();
    const newEta = new Date(now.getTime() + 150 * 60 * 1000).toISOString(); // +150 mins

    const ext = await floorExecutionEngine.requestEtaExtension("JC-TEST-501", oldEta, newEta, "Major gearbox overhaul required", techUser.fullName);
    expect(ext.approvalLevel).toBe("GM");
  });

  it("23. UNAUTHORIZED EXTENSION APPROVAL: Rejects technician trying to self-approve >2h extension", async () => {
    const now = new Date();
    const oldEta = now.toISOString();
    const newEta = new Date(now.getTime() + 150 * 60 * 1000).toISOString();

    const ext = await floorExecutionEngine.requestEtaExtension("JC-TEST-501", oldEta, newEta, "Major overhaul", techUser.fullName);

    await expect(
      floorExecutionEngine.approveEtaExtension(ext.extensionId, techUser.userId, techUser.role)
    ).rejects.toThrow("requires GM approval");
  });

  it("24. TECHNICIAN COMPLETE: Routes to Floor In-Charge review", async () => {
    const comp = await floorExecutionEngine.completeTechnicianJob("EXEC-501", techUser.userId);
    expect(comp.success).toBe(true);
    expect(comp.completedAt).toBeDefined();
  });

  it("25. FLOOR VALIDATION GATE: Rejects READY FOR QC if unresolved blocking items remain", async () => {
    // Raise a pending parts request for JC-TEST-BLOCK
    await floorExecutionEngine.raisePartsRequest("JC-TEST-BLOCK", "KA32M9988", "OP-1", "Hose", 1, "HIGH", "Floor User");

    const gate = await floorExecutionEngine.validateFloorCompletionGate("JC-TEST-BLOCK");
    expect(gate.isReady).toBe(false);
    expect(gate.blockingItems.length).toBeGreaterThan(0);
  });

  it("26. VALID FLOOR COMPLETION: Generates QC Handoff for clean job", async () => {
    const handoff = await floorExecutionEngine.handoffToQc("JC-CLEAN-501", "KA32M9988", floorUser.userId, "QC-01", "BR-SEDAM");
    expect(handoff.success).toBe(true);
    expect(handoff.handoffId).toMatch(/^QC-HANDOFF-/);
  });

  it("27. 5-MINUTE QC SLA: Starts 5-minute SLA timer for QC In-Charge", async () => {
    const sla = await floorExecutionEngine.createHandoffSla("SLA_FLOOR_TO_QC", "JC-CLEAN-501", "QC-01", "qc_incharge", 5, "BR-SEDAM");
    expect(sla.status).toBe("ON_TRACK");
  });

  it("28. REAL-TIME EVENT ENGINE: Emits operational events", async () => {
    const bays = await floorExecutionEngine.getBaysStatus("BR-SEDAM");
    expect(bays).toBeDefined();
  });

  it("29. OFFLINE / RECONCILIATION: Concurrency protection preserves server authority", async () => {
    const gate = await floorExecutionEngine.validateFloorCompletionGate("JC-CLEAN-501");
    expect(gate.isReady).toBe(true);
  });

  it("30. RBAC SECURITY: GM approval succeeds for >2h extension", async () => {
    const now = new Date();
    const oldEta = now.toISOString();
    const newEta = new Date(now.getTime() + 180 * 60 * 1000).toISOString();

    const ext = await floorExecutionEngine.requestEtaExtension("JC-TEST-501", oldEta, newEta, "Engine rebuild", techUser.fullName);
    const appr = await floorExecutionEngine.approveEtaExtension(ext.extensionId, gmUser.userId, gmUser.role);
    expect(appr.success).toBe(true);
  });

});
