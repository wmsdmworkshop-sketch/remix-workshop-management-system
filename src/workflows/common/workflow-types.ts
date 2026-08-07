export type LifecyclePhase = 
  | "Draft"
  | "In Progress"
  | "Waiting Evidence"
  | "Waiting Approval"
  | "External Processing"
  | "Financial Processing"
  | "Completed"
  | "Closed";

export type ProgramCategory = "WARRANTY" | "AMC" | "GOODWILL" | "FSB" | "CAMPAIGN" | "INSURANCE" | "FLEET_CONTRACT" | "INTERNAL_REPAIR";

export type ProgramStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED" | "COMPLETED";

export type ExternalReferenceType = "OEM_CLAIM" | "ERP_ORDER" | "CRM_TICKET" | "SAP_DOC";
