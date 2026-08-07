export type JobCardWorkflowState = 
  | "APPOINTMENT" 
  | "GATE_ENTRY" 
  | "INSPECTION" 
  | "JOB_CARD_CREATED" 
  | "ESTIMATE_APPROVAL" 
  | "BAY_ALLOCATED" 
  | "TECH_ASSIGNED" 
  | "REPAIR_IN_PROGRESS" 
  | "QC" 
  | "WASH" 
  | "PDI" 
  | "READY_FOR_DELIVERY" 
  | "DELIVERED" 
  | "CLOSED";

export type OperationalState = 
  | "WAITING_FOR_BAY"
  | "WAITING_FOR_PARTS"
  | "WAITING_FOR_APPROVAL"
  | "IN_BAY"
  | "ROAD_TEST"
  | "WASH_QUEUE"
  | "READY";

export type InspectionStage = "IN_PROCESS" | "FINAL";

export type ServiceType = "GENERAL_REPAIR" | "SCHEDULED_SERVICE" | "ACCIDENT_REPAIR" | "PDI" | "BREAKDOWN";

export interface EstimateLine {
  itemType: "LABOUR" | "PARTS" | "CONSUMABLES";
  description: string;
  amount: number;
}
