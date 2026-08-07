// ============================================================
// DWIP Mobile Ecosystem — Shared Types & Domain Models
// ============================================================
// Supports: App 1 (Staff App - 18 Roles), App 2 (Management App),
//           App 3 (Customer App V2), App 4 (Driver App)
// ============================================================

export type MobileRole =
  | "GATE_TEAM"
  | "RECEPTION"
  | "SERVICE_ADVISOR"
  | "WORKSHOP_MANAGER"
  | "TECHNICIAN"
  | "ELECTRICIAN"
  | "HELPERS"
  | "WASHING_TEAM"
  | "PDI_TEAM"
  | "ROAD_TEST"
  | "QUALITY_INSPECTOR"
  | "WARRANTY_TEAM"
  | "PARTS_TEAM"
  | "STORES_TEAM"
  | "PURCHASE_TEAM"
  | "CASHIER"
  | "HR"
  | "ADMIN"
  | "MANAGEMENT"
  | "CUSTOMER"
  | "DRIVER";

export interface MobileUserClaims {
  userId: string;
  mobile: string;
  name: string;
  role: MobileRole;
  branchId: string;
  departmentPermissions: string[];
  customerPassportId?: string;
  driverLicenseNo?: string;
}

export interface GateEntryPayload {
  vrn: string;
  vehicleMake: string;
  vehicleModel: string;
  chassisNo?: string;
  kmReading?: number;
  driverName?: string;
  driverMobile?: string;
  fuelLevel?: string;
  photos: string[];
  inventoryItemsCheck?: Record<string, boolean>;
  notes?: string;
}

export interface TechnicianJobTimerPayload {
  jobCardNo: string;
  action: "START" | "PAUSE" | "RESUME" | "FINISH";
  taskDescription?: string;
  pauseReason?: string;
  voiceNoteUrl?: string;
  photos?: string[];
}

export interface DriverInspectionPayload {
  vrn: string;
  driverMobile: string;
  inspectionDate: string;
  odometerReading: number;
  tyrePressureOk: boolean;
  engineOilOk: boolean;
  brakesOk: boolean;
  lightsOk: boolean;
  defLevelOk: boolean;
  defectsLogged?: Array<{ item: string; severity: "MINOR" | "MAJOR" | "CRITICAL"; notes: string; photoUrl?: string }>;
}

export interface ExecutiveKPISummary {
  todayRevenue: number;
  activeJobCards: number;
  bayUtilizationPct: number;
  technicianProductivityPct: number;
  pendingApprovalsCount: number;
  slaBreachAlerts: Array<{ jobCardNo: string; vrn: string; delayMinutes: number; advisorName: string }>;
}
