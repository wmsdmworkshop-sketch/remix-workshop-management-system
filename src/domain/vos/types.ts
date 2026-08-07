/**
 * DWIP Enterprise WOS - Domain Models, Enums & Validation
 * DWIP-DB-001 Version 1.0 Canonical Freeze
 */

// =============================================================================
// ENUMS (DWIP-ENUM-001)
// =============================================================================

export enum VisitType {
  NORMAL_SERVICE = 'NORMAL_SERVICE',
  BREAKDOWN = 'BREAKDOWN',
  ACCIDENT = 'ACCIDENT',
  REPEAT_REPAIR = 'REPEAT_REPAIR',
  PDI = 'PDI',
  CAMPAIGN = 'CAMPAIGN',
  FSB = 'FSB',
  INTERNAL = 'INTERNAL'
}

export enum CommercialType {
  CUSTOMER_PAY = 'CUSTOMER_PAY',
  WARRANTY = 'WARRANTY',
  GOODWILL = 'GOODWILL',
  AMC = 'AMC',
  FREE_SERVICE = 'FREE_SERVICE',
  INSURANCE = 'INSURANCE'
}

export enum EntrySource {
  MANUAL = 'MANUAL',
  ANPR = 'ANPR',
  OCR = 'OCR',
  API = 'API',
  MOBILE = 'MOBILE',
  TMSA = 'TMSA'
}

export enum VosPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  VIP = 'VIP',
  EMERGENCY = 'EMERGENCY',
  ROAD_BLOCKED = 'ROAD_BLOCKED'
}

export enum VosRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED'
}

export enum HandoverType {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
  ESCALATION = 'ESCALATION',
  GM_OVERRIDE = 'GM_OVERRIDE'
}

export enum TimelineCategory {
  OPERATIONAL = 'OPERATIONAL',
  INTERNAL_SLA = 'INTERNAL_SLA',
  OEM = 'OEM'
}

export enum SlaStatus {
  ON_TRACK = 'ON_TRACK',
  WARNING = 'WARNING',
  BREACHED = 'BREACHED'
}

export enum RelationshipType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  DEPENDENCY = 'DEPENDENCY',
  REFERENCE = 'REFERENCE'
}

export enum EntityModule {
  SERVICE = 'SERVICE',
  CRM = 'CRM',
  PARTS = 'PARTS',
  HR = 'HR',
  WARRANTY = 'WARRANTY',
  INVENTORY = 'INVENTORY',
  FINANCE = 'FINANCE'
}

export enum AttributeType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  DATETIME = 'DATETIME'
}

export enum AttributeSource {
  GATE_IN = 'GATE_IN',
  IOT_TELEMATICS = 'IOT_TELEMATICS',
  DIAGNOSTIC_TOOL = 'DIAGNOSTIC_TOOL',
  OEM_API = 'OEM_API',
  MANUAL_ENTRY = 'MANUAL_ENTRY'
}

// =============================================================================
// DOMAIN INTERFACES (DWIP-DB-001 v1.0)
// =============================================================================

export interface IVos {
  id: string;
  publicId: string;
  companyId: string;
  dealerId: string;
  vosNumber: string;
  branchId: string;
  vehicleId: string;
  vehicleExternalId?: string;
  customerId: string;
  customerExternalId?: string;
  visitType: VisitType;
  commercialType: CommercialType;
  entrySource: EntrySource;
  isBreakdown: boolean;
  gateInLatitude?: number;
  gateInLongitude?: number;
  locationAccuracy?: number;
  currentState: string;
  currentStateCode: string;
  currentStateVersion: number;
  currentOwner: string;
  operationalStatus: string;
  priority: VosPriority;
  riskLevel: VosRiskLevel;
  riskScore: number;
  riskReason?: string;
  sourceSystem?: string;
  syncStatus?: string;
  syncVersion: number;
  lastSyncedAt?: string;
  externalReference?: string;
  dataClassification: DataClassification;
  gateInTime: string;
  gateOutTime?: string;
  closedAt?: string;
  isClosed: boolean;
  // Immutable Vehicle Snapshot
  registrationNumber: string;
  chassisNumber: string;
  engineNumber?: string;
  vehicleModel?: string;
  vehicleVariant?: string;
  fuelType?: string;
  emissionNorm?: string;
  manufacturingYear?: number;
  odometerAtGateIn?: number;
  warrantyStatusAtGateIn?: string;
  oemServicePlan?: string;
  // Immutable Driver Snapshot
  driverName?: string;
  driverMobile?: string;
  driverLicenseNumber?: string;
  driverType?: string;
  // Immutable Customer Snapshot
  customerName?: string;
  fleetName?: string;
  contactPerson?: string;
  gstNumber?: string;
  customerType?: string;
  fleetSize?: number;
  // Audit Columns
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version: number;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface IVosStateHistory {
  id: string;
  publicId: string;
  vosId: string;
  fromState: string;
  toState: string;
  timeSpentSeconds?: number;
  changedBy: string;
  changedByRole: string;
  transitionReason?: string;
  createdAt: string;
}

export interface IVosOwnerHistory {
  id: string;
  publicId: string;
  vosId: string;
  previousOwner: string;
  previousOwnerRole: string;
  newOwner: string;
  newOwnerRole: string;
  handoverType: HandoverType;
  transferredBy: string;
  handoverNotes?: string;
  createdAt: string;
}

export interface IVosTimeline {
  id: string;
  publicId: string;
  vosId: string;
  timelineCategory: TimelineCategory;
  eventType: string;
  title: string;
  description?: string;
  structuredMetadataJson?: string;
  recordedAt: string;
  slaStatus?: SlaStatus;
}

export interface IVosConfigurationReference {
  id: string;
  publicId: string;
  vosId: string;
  branchId: string;
  configVersion: string;
  workflowVersion: string;
  businessRuleVersion: string;
  rulesetSnapshotJson: string;
  createdAt: string;
}

export interface IVosLink {
  id: string;
  publicId: string;
  vosId: string;
  entityModule: EntityModule;
  entityType: string;
  entityId: string;
  relationshipType: RelationshipType;
  linkedBy: string;
  linkedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface IVosAttribute {
  id: string;
  publicId: string;
  vosId: string;
  attributeName: string;
  attributeValue: string;
  attributeType: AttributeType;
  unit?: string;
  confidenceScore?: number;
  source: AttributeSource;
  capturedAt: string;
  createdAt: string;
  createdBy?: string;
}

export interface IVosTag {
  id: string;
  publicId: string;
  vosId: string;
  tagName: string;
  tagCategory: string;
  createdBy: string;
  createdAt: string;
}

// =============================================================================
// DOMAIN VALIDATOR HELPERS
// =============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const vosValidator = {
  parse(data: any): IVos {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid VOS payload');
    }
    if (!data.id || !data.vosNumber || !data.registrationNumber || !data.chassisNumber) {
      throw new Error('VOS mandatory fields missing: id, vosNumber, registrationNumber, chassisNumber');
    }
    return data as IVos;
  },
  safeParse(data: any): ValidationResult<IVos> {
    try {
      const parsed = this.parse(data);
      return { success: true, data: parsed };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
