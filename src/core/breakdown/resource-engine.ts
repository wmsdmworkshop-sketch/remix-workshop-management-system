import { AllocatedResource, ResourceAllocationRequest } from "./breakdown-types";

export class ResourceEngine {
  
  /**
   * Evaluates best resource taking into account proximity, skills, shifts, and workload.
   * This is a simplified deterministic model for testing purposes.
   */
  public static evaluateBestResource(request: ResourceAllocationRequest): AllocatedResource {
    let confidence = 0.9;
    let eta = 30; // 30 minutes default
    let techId = "TECH-01";
    let qrtId = "QRT-ALPHA";
    let vanId = undefined;

    // Simulate rule: if required skills include "HIGH_VOLTAGE", assign specialized team
    if (request.required_skills && request.required_skills.includes("HIGH_VOLTAGE")) {
      techId = "TECH-HV-99";
      qrtId = "QRT-EV";
      eta = 45; // specialized teams might take longer
      confidence = 0.85;
    }

    // Simulate rule: Mobile van requirement
    if (request.is_mobile_van_required) {
       vanId = "VAN-007";
       eta += 15; // Mobile vans need loading time
    }

    return {
      workshop_id: "WS-MAIN-01",
      qrt_team_id: qrtId,
      technician_id: techId,
      mobile_van_id: vanId,
      estimated_arrival_minutes: eta,
      confidence_score: confidence
    };
  }
}
