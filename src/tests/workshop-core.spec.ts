import { describe, it, expect } from "vitest";

import { GateEntryEngine } from "../workshop/gate-entry-engine";
import { InspectionEngine } from "../workshop/inspection-engine";
import { EstimateEngine } from "../workshop/estimate-engine";
import { ApprovalEngine } from "../workshop/approval-engine";
import { BayAllocationEngine } from "../workshop/bay-allocation-engine";
import { TechnicianAssignmentEngine } from "../workshop/technician-assignment-engine";
import { RepairEngine } from "../workshop/repair-engine";
import { PartsAllocationEngine } from "../workshop/parts-allocation-engine";
import { QualityEngine } from "../workshop/quality-engine";
import { RoadTestEngine } from "../workshop/roadtest-engine";
import { WashEngine } from "../workshop/wash-engine";
import { DeliveryEngine } from "../workshop/delivery-engine";
import { FeedbackEngine } from "../workshop/feedback-engine";

import { Bay } from "../workshop/bay-models";
import { Technician } from "../workshop/technician-models";
import { RepairOperation } from "../workshop/repair-models";
import { PartRequisition } from "../workshop/parts-models";
import { QualityControl } from "../workshop/quality-models";
import { RoadTest } from "../workshop/roadtest-models";
import { VehicleDelivery } from "../workshop/delivery-models";
import { Wash } from "../workshop/wash-models";

describe("Workshop Operations Core", () => {

  it("should process Gate Entry and Reception", () => {
    const entry = GateEntryEngine.createEntry("MH01AB1234", "G1", "John", "999", "SERVICE");
    expect(entry.status).toBe("ENTERED");
    
    const reception = GateEntryEngine.createReception(entry, "John Doe", "R1");
    expect(reception.status).toBe("WAITING");
    expect(reception.vehicle_registration).toBe("MH01AB1234");
  });

  it("should manage Inspection", () => {
    let inspection = InspectionEngine.createInspection("JC-1", "MH01AB1234", "ADV-1");
    expect(inspection.status).toBe("PENDING");
    
    inspection = InspectionEngine.completeInspection(inspection);
    expect(inspection.status).toBe("COMPLETED");
  });

  it("should manage Estimates", () => {
    let estimate = EstimateEngine.createEstimate("JC-1", 1000, 2000, 0, 100);
    expect(estimate.total_amount).toBeGreaterThan(3100); // with tax
    
    estimate = EstimateEngine.reviseEstimate(estimate, 1500, 2000);
    expect(estimate.revision_history.length).toBe(1);
    expect(estimate.labour_estimate).toBe(1500);
  });

  it("should manage Approvals", () => {
    let approval = ApprovalEngine.requestApproval("JC-1", "EST-1", "SMS", "OTP");
    expect(approval.status).toBe("REQUESTED");
    
    approval = ApprovalEngine.grantApproval(approval);
    expect(approval.status).toBe("APPROVED");
  });

  it("should allocate and release Bays", () => {
    let bay: Bay = { bay_id: "B1", name: "Bay 1", capacity: "LMD", status: "IDLE" };
    bay = BayAllocationEngine.allocateBay(bay, "JC-1");
    expect(bay.status).toBe("OCCUPIED");
    expect(bay.current_job_card_id).toBe("JC-1");
    
    bay = BayAllocationEngine.releaseBay(bay);
    expect(bay.status).toBe("IDLE");
  });

  it("should assign and release Technicians", () => {
    let tech: Technician = {
      technician_id: "T1", name: "Bob", skill_matrix: [], certification: [],
      attendance: "PRESENT", shift: "MORNING", current_jobs: [],
      productivity_percent: 100, efficiency_percent: 100, idle_time_mins: 0
    };
    
    tech = TechnicianAssignmentEngine.assignJob(tech, "JC-1");
    expect(tech.current_jobs).toContain("JC-1");
    
    tech = TechnicianAssignmentEngine.releaseJob(tech, "JC-1");
    expect(tech.current_jobs).not.toContain("JC-1");
  });

  it("should track Repairs", () => {
    let repair: RepairOperation = {
      operation_id: "OP-1", job_card_id: "JC-1", description: "Oil Change",
      technician_id: "T1", status: "PENDING", pause_history: [], labour_hours: 1
    };
    
    repair = RepairEngine.startRepair(repair);
    expect(repair.status).toBe("IN_PROGRESS");
    
    repair = RepairEngine.pauseRepair(repair, "Waiting for Parts");
    expect(repair.status).toBe("PAUSED");
    expect(repair.pause_history.length).toBe(1);
    
    repair = RepairEngine.completeRepair(repair);
    expect(repair.status).toBe("COMPLETED");
  });

  it("should allocate Parts", () => {
    let partReq: PartRequisition = {
      requisition_id: "REQ-1", job_card_id: "JC-1", part_number: "P1", quantity: 1,
      status: "REQUESTED", core_return_required: false, warranty_part: false
    };
    
    partReq = PartsAllocationEngine.issuePart(partReq);
    expect(partReq.status).toBe("ISSUED");
  });

  it("should handle Quality Control", () => {
    let qc: QualityControl = {
      qc_id: "QC-1", job_card_id: "JC-1", qc_inspector_id: "I1", status: "PENDING",
      checklist: [], defects_found: [], qc_time: ""
    };
    
    const passedQc = QualityEngine.passQc(qc);
    expect(passedQc.status).toBe("PASSED");
    
    const failedQc = QualityEngine.failQc(qc, ["Scratch"], "Needs polishing");
    expect(failedQc.status).toBe("REWORK_REQUIRED");
  });

  it("should handle Road Tests", () => {
    let test: RoadTest = {
      road_test_id: "RT-1", job_card_id: "JC-1", driver_id: "D1",
      distance_km: 0, observations: "", status: "PENDING", repeat_repair_required: false,
      start_time: "", end_time: ""
    };
    
    test = RoadTestEngine.passRoadTest(test, 5, "All good");
    expect(test.status).toBe("PASSED");
  });

  it("should handle Wash", () => {
    let wash: Wash = { wash_id: "W-1", job_card_id: "JC-1", status: "PENDING" };
    wash = WashEngine.startWash(wash);
    expect(wash.status).toBe("IN_PROGRESS");
    wash = WashEngine.completeWash(wash);
    expect(wash.status).toBe("COMPLETED");
  });

  it("should handle Vehicle Delivery", () => {
    let delivery: VehicleDelivery = {
      delivery_id: "DEL-1", job_card_id: "JC-1", invoice_linked: true, payment_status: "COMPLETED",
      photos: [], delivery_checklist: [], status: "PENDING"
    };
    
    delivery = DeliveryEngine.initiateDelivery(delivery);
    expect(delivery.status).toBe("READY_FOR_DELIVERY");
    
    delivery = DeliveryEngine.completeDelivery(delivery);
    expect(delivery.status).toBe("DELIVERED");
  });

  it("should track Customer Feedback", () => {
    let feedback = FeedbackEngine.submitFeedback("JC-1", "C1", 5, 2, "Poor service");
    expect(feedback.escalation_required).toBe(true);
    
    feedback = FeedbackEngine.resolveFeedback(feedback);
    expect(feedback.status).toBe("RESOLVED");
  });

});
