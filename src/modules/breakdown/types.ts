/**
 * DWIP Enterprise Platform - Breakdown & QRT Module Types
 * Sprint: DWIP-S2-001 Revision-9 (Tow-to-Workshop Operational Hardening)
 * Architecture: DWIP-INT-ARCH-001 v1.0
 */

export type NotificationOrigin = 'QRT_APP' | 'TMSA' | 'EMAIL' | 'MANUAL' | 'API';

export type BreakdownCategory =
  | 'MECHANICAL'
  | 'ELECTRICAL'
  | 'AIR_SYSTEM'
  | 'BRAKE_SYSTEM'
  | 'CLUTCH'
  | 'GEARBOX'
  | 'ENGINE'
  | 'SCR'
  | 'DPF'
  | 'DEF'
  | 'TYRE'
  | 'BATTERY'
  | 'ACCIDENT'
  | 'FUEL'
  | 'OTHER';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'VEHICLE_BLOCKING';

export type BreakdownStatus =
  | 'OPEN'
  | 'QRT_DISPATCHED'
  | 'QRT_ARRIVED'
  | 'REPAIR_IN_PROGRESS'
  | 'TOW_IN_PROGRESS'
  | 'RESOLVED_ROADSIDE'
  | 'TRANSFERRED_TO_WORKSHOP'
  | 'CLOSED';

export type RoadsideOutcome =
  | 'REPAIR_COMPLETE'
  | 'TEMPORARY_REPAIR'
  | 'WORKSHOP_REQUIRED'
  | 'TOW_REQUIRED'
  | 'OEM_ESCALATION';

export type TowingStatus =
  | 'NONE'
  | 'TOW_REQUESTED'
  | 'TOW_ASSIGNED'
  | 'TOW_ARRIVED'
  | 'VEHICLE_LOADED'
  | 'TOW_STARTED'
  | 'WORKSHOP_ARRIVED'
  | 'GATE_ENTRY_CREATED'
  | 'DELIVERED_TO_WORKSHOP';

export type GateSecurityStatus = 'EXPECTED' | 'ARRIVED' | 'ENTERED';

export type MediaCategory =
  | 'VEHICLE_FRONT'
  | 'VEHICLE_REAR'
  | 'ODOMETER'
  | 'VIN'
  | 'FAULT'
  | 'PART'
  | 'SCR'
  | 'DPF'
  | 'ENGINE'
  | 'REPAIR'
  | 'CUSTOMER_SIGNATURE'
  | 'GPS_LOCATION';

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: string;
  addressSummary?: string;
}

export type QrtReachSlaStatus = 'ON_TRACK' | 'WARNING' | 'BREACHED';

export interface QrtReachSlaMetrics {
  complaintRegisteredAt: string;
  reachedLocationAt?: string;
  isNightWindow: boolean;
  targetMinutes: number; // 120 (Day) or 240 (Night)
  reachTargetTime: string;
  elapsedMinutes: number;
  remainingMinutes: number;
  slaStatus: QrtReachSlaStatus;
}

export interface OperationalTimestamps {
  complaintRegisteredAt: string;
  notificationReceivedAt: string;
  qrtAcceptedAt?: string;
  dispatchAt?: string;
  reachedLocationAt?: string;
  diagnosisStartedAt?: string;
  repairStartedAt?: string;
  repairCompletedAt?: string;
  towRequestedAt?: string;
  towAssignedAt?: string;
  vehicleLoadedAt?: string;
  towStartedAt?: string;
  workshopETAUpdatedAt?: string;
  workshopArrivedAt?: string;
  gateEntryCreatedAt?: string;
  jobCardCreatedAt?: string;
  workshopAcknowledgedAt?: string;
}

export interface EnhancedEtaTracking {
  originalEta: string;
  currentEta: string;
  lastUpdated: string;
  delayReason?: string;
}

export interface WorkshopPreparationStatus {
  managerNotified: boolean;
  bayAllocated?: string;
  serviceAdvisorAssigned?: string;
  partsPrepared?: boolean;
  workshopReady: boolean;
}

export type TowingMilestoneEventType =
  | 'TowRequested'
  | 'TowAssigned'
  | 'VehicleLoaded'
  | 'TowStarted'
  | 'WorkshopETAUpdated'
  | 'WorkshopArrived'
  | 'GateEntryCreated'
  | 'JobCardCreated';

export interface TowingMilestoneEventPayload {
  eventType: TowingMilestoneEventType;
  breakdownId: string;
  vosId: string;
  registrationNumber: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface IncomingBreakdownDashboardItem {
  breakdownId: string;
  vosId: string;
  registrationNumber: string;
  complaintNumber: string;
  category: BreakdownCategory;
  severity: SeverityLevel;
  towingStatus: TowingStatus;
  gateSecurityStatus: GateSecurityStatus;
  originalEta: string;
  currentEta: string;
  delayReason?: string;
  assignedQrtId?: string;
  assignedServiceAdvisorId?: string;
  allocatedBayId?: string;
  workshopReady: boolean;
}

export interface BreakdownMediaItem {
  mediaId: string;
  category: MediaCategory;
  fileName: string;
  mimeType: string;
  storageUrl: string;
  uploadedAt: string;
}

export interface RoadsideDiagnosis {
  diagnosisId: string;
  breakdownId: string;
  faultCode?: string;
  description: string;
  diagnosedBy: string;
  diagnosedAt: string;
  media: BreakdownMediaItem[];
}

export interface RoadsideRepair {
  repairId: string;
  breakdownId: string;
  partsReplaced?: string[];
  workDone: string;
  outcome: RoadsideOutcome;
  repairedBy: string;
  repairedAt: string;
  media: BreakdownMediaItem[];
}

export interface TowingDecision {
  towingId: string;
  breakdownId: string;
  towingProviderId: string;
  towingVehicleId: string;
  driverName: string;
  driverPhone: string;
  status: TowingStatus;
  gateSecurityStatus: GateSecurityStatus;
  etaTracking: EnhancedEtaTracking;
  preparation: WorkshopPreparationStatus;
  requestedAt: string;
}

export interface BreakdownClosure {
  closureId: string;
  breakdownId: string;
  finalOutcome: RoadsideOutcome;
  closedBy: string;
  closedAt: string;
  summary: string;
}

export interface BreakdownCase {
  id: string;
  vosId: string;
  companyId: string;
  dealerId: string;
  branchId: string;
  registrationNumber: string;
  vin: string;
  customerCode: string;
  origin: NotificationOrigin;
  category: BreakdownCategory;
  severity: SeverityLevel;
  status: BreakdownStatus;
  location: GpsLocation;
  complaintSummary: string;
  timestamps: OperationalTimestamps;
  reachSla: QrtReachSlaMetrics;
  diagnosis?: RoadsideDiagnosis;
  repair?: RoadsideRepair;
  towing?: TowingDecision;
  closure?: BreakdownClosure;
  createdAt: string;
  updatedAt: string;
}
