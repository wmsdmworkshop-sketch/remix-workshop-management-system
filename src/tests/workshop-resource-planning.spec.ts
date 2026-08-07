import { describe, it, expect } from "vitest";

import { BranchCapacityEngine } from "../workshop/resource-planning/branch-capacity-engine";
import { BayCapacityEngine } from "../workshop/resource-planning/bay-capacity-engine";
import { TechnicianCapacityEngine } from "../workshop/resource-planning/technician-capacity-engine";
import { AdvisorWorkloadEngine } from "../workshop/resource-planning/advisor-workload-engine";
import { EquipmentUtilizationEngine } from "../workshop/resource-planning/equipment-utilization-engine";
import { SchedulerEngine } from "../workshop/resource-planning/scheduler-engine";
import { CapacityEngine } from "../workshop/resource-planning/capacity-engine";
import { ForecastEngine } from "../workshop/resource-planning/forecast-engine";
import { OptimizationEngine } from "../workshop/resource-planning/optimization-engine";
import { LeaveBalancingEngine } from "../workshop/resource-planning/leave-balancing-engine";
import { ShiftPlanningEngine } from "../workshop/resource-planning/shift-planning-engine";
import { BottleneckEngine } from "../workshop/resource-planning/bottleneck-engine";

import { Branch } from "../workshop/resource-planning/branch-models";
import { BayCapacity } from "../workshop/resource-planning/bay-capacity-models";
import { TechnicianCapacity } from "../workshop/resource-planning/technician-capacity-models";
import { AdvisorCapacity } from "../workshop/resource-planning/advisor-capacity-models";
import { Equipment } from "../workshop/resource-planning/equipment-models";
import { ScheduleEvent } from "../workshop/resource-planning/scheduler-models";
import { CapacityPlan } from "../workshop/resource-planning/capacity-models";
import { Leave } from "../workshop/resource-planning/leave-models";
import { Shift } from "../workshop/resource-planning/shift-models";

describe("Workshop Resource Planning", () => {
  
  it("should calculate Branch Capacity", () => {
    const branch: Branch = {
      branch_id: "B1", name: "Kalaburagi", region: "North",
      working_hours: { start: "09:00", end: "18:00" },
      capacity: 100, holiday_calendar_id: "H1", weekly_off: "SUNDAY",
      operational_status: "OPEN"
    };
    
    expect(BranchCapacityEngine.getWorkingHours(branch)).toBe(9);
    expect(BranchCapacityEngine.isOperational(branch, "2023-10-02")).toBe(true); // Assuming not sunday for test, this is mock logic
  });

  it("should manage Bay Capacity", () => {
    let bayCap: BayCapacity = {
      workshop_id: "W1", total_bays: 10, occupied: 2, reserved: 1, maintenance: 1, idle: 6, available: 6,
      bay_type_breakdown: { pit: 2, lift: 4, quick_service: 1, alignment: 1, electrical: 1, engine: 1, transmission: 0 },
      expected_release_times: []
    };
    
    expect(BayCapacityEngine.calculateAvailability(bayCap)).toBe(6);
    
    bayCap = BayCapacityEngine.updateOccupancy(bayCap, 1);
    expect(bayCap.occupied).toBe(3);
    expect(bayCap.available).toBe(5);
  });

  it("should manage Technician Capacity", () => {
    const tech: TechnicianCapacity = {
      technician_id: "T1", grade: "A", certification: [],
      vehicle_family_skills: ["Ace", "Intra"], aggregate_skills: [],
      attendance: "PRESENT", leave_status: "NONE", shift_id: "S1",
      current_jobs: ["JC-1"], planned_jobs: [],
      utilization_percent: 0, efficiency_percent: 0, productivity_percent: 0
    };
    
    expect(TechnicianCapacityEngine.calculateUtilization(tech, 4)).toBe(25);
    expect(TechnicianCapacityEngine.canAssignJob(tech, "Ace", 4)).toBe(true);
    expect(TechnicianCapacityEngine.canAssignJob(tech, "Bus", 4)).toBe(false); // wrong skill
  });

  it("should manage Advisor Workload", () => {
    let advisor: AdvisorCapacity = {
      advisor_id: "A1", assigned_job_cards: [], open_job_cards: 0,
      delivery_pending: 0, revenue_labour: 0, revenue_parts: 0, average_tat_hours: 0, customer_rating: 5
    };
    
    expect(AdvisorWorkloadEngine.canAssignJob(advisor, 5)).toBe(true);
    advisor = AdvisorWorkloadEngine.assignJob(advisor, "JC-1");
    expect(advisor.open_job_cards).toBe(1);
    advisor = AdvisorWorkloadEngine.closeJob(advisor, "JC-1");
    expect(advisor.open_job_cards).toBe(0);
  });

  it("should manage Equipment Utilization", () => {
    let eq: Equipment = {
      equipment_id: "E1", name: "Lift 1", type: "LIFT", workshop_id: "W1",
      availability_status: "AVAILABLE", preventive_maintenance_due: false, last_inspection_date: ""
    };
    
    expect(EquipmentUtilizationEngine.isAvailable(eq)).toBe(true);
    eq = EquipmentUtilizationEngine.assignEquipment(eq, "T1");
    expect(eq.availability_status).toBe("IN_USE");
    eq = EquipmentUtilizationEngine.releaseEquipment(eq);
    expect(eq.availability_status).toBe("AVAILABLE");
  });

  it("should schedule events", () => {
    const event1 = SchedulerEngine.createEvent("BAY", "B1", "JC-1", "2023-10-01T10:00:00Z", "2023-10-01T12:00:00Z");
    const event2 = SchedulerEngine.createEvent("BAY", "B1", "JC-2", "2023-10-01T11:00:00Z", "2023-10-01T13:00:00Z"); // Overlap
    const event3 = SchedulerEngine.createEvent("BAY", "B1", "JC-3", "2023-10-01T13:00:00Z", "2023-10-01T15:00:00Z"); // No overlap
    
    expect(SchedulerEngine.detectOverlap(event1, event2)).toBe(true);
    expect(SchedulerEngine.detectOverlap(event1, event3)).toBe(false);
  });

  it("should plan capacity", () => {
    let plan = CapacityEngine.generateDailyPlan("W1", "2023-10-01", 10, 8); // 80 hours total
    expect(plan.daily_capacity_hours).toBe(80);
    expect(plan.available_capacity_hours).toBe(80);
    
    plan = CapacityEngine.bookCapacity(plan, 5);
    expect(plan.booked_capacity_hours).toBe(5);
    expect(plan.available_capacity_hours).toBe(75);
  });

  it("should generate forecast", () => {
    const forecast = ForecastEngine.generateForecast("W1", "2023-10-01", 10);
    expect(forecast.expected_incoming_vehicles).toBe(11); // 10% growth mock
    expect(forecast.expected_revenue).toBe(50000);
  });

  it("should optimize resources", () => {
    const bays = { available: 5, total_bays: 10 } as any;
    const techs = [{ utilization_percent: 50 }] as any;
    const opt = OptimizationEngine.optimize("W1", bays, techs);
    
    expect(opt.bay_allocation_score).toBe(90);
    expect(opt.technician_allocation_score).toBe(95);
    expect(opt.workshop_load_balanced).toBe(true);
  });

  it("should balance leaves", () => {
    let leave: Leave = { leave_id: "L1", technician_id: "T1", start_date: "", end_date: "", status: "PENDING" };
    leave = LeaveBalancingEngine.approveLeave(leave, 1, 5);
    expect(leave.status).toBe("APPROVED");
    
    expect(() => LeaveBalancingEngine.approveLeave(leave, 5, 5)).toThrowError();
  });

  it("should plan shifts", () => {
    let shift: Shift = { shift_id: "S1", name: "MORNING", start_time: "", end_time: "", roster: [], overtime_allowed: false };
    shift = ShiftPlanningEngine.assignTechnicianToShift(shift, "T1", "2023-10-01");
    expect(shift.roster.length).toBe(1);
    expect(shift.roster[0].technician_id).toBe("T1");
  });

  it("should detect bottlenecks", () => {
    const bays = { available: 0 } as any;
    const techs = [{ attendance: "PRESENT", utilization_percent: 100 }] as any;
    
    const wl = BottleneckEngine.detectBottlenecks("W1", "2023-10-01", bays, techs);
    expect(wl.bay_shortage).toBe(true);
    expect(wl.technician_shortage).toBe(true);
  });

});
