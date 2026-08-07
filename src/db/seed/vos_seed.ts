/**
 * DWIP Enterprise WOS - Canonical Seed Script (DWIP-DB-001 v1.0)
 * Seed Data for VOS persistent domain foundation testing.
 */

import {
  IVos,
  IVosStateHistory,
  IVosOwnerHistory,
  IVosTimeline,
  IVosConfigurationReference,
  IVosLink,
  IVosAttribute,
  IVosTag,
  VisitType,
  CommercialType,
  EntrySource,
  VosPriority,
  VosRiskLevel,
  DataClassification,
  HandoverType,
  TimelineCategory,
  SlaStatus,
  RelationshipType,
  EntityModule,
  AttributeType,
  AttributeSource
} from '../../domain/vos/types';

export const seedVosRecord: IVos = {
  id: 'a0000000-0000-4000-8000-000000000001',
  publicId: 'PUB-VOS-2026-0001',
  companyId: 'COMP-TATA-MOTORS',
  dealerId: 'DLR-MUMBAI-01',
  vosNumber: 'TATA-BR01-2026-000001',
  branchId: 'BR-MUMBAI-CENTRAL',
  vehicleId: 'veh_uuid_1001',
  vehicleExternalId: 'EXT-VEH-98765',
  customerId: 'cust_uuid_2001',
  customerExternalId: 'EXT-CUST-54321',
  visitType: VisitType.NORMAL_SERVICE,
  commercialType: CommercialType.CUSTOMER_PAY,
  entrySource: EntrySource.ANPR,
  isBreakdown: false,
  gateInLatitude: 19.0760,
  gateInLongitude: 72.8777,
  locationAccuracy: 2.5,
  currentState: 'GATE_IN',
  currentStateCode: 'STATE_GATE_IN',
  currentStateVersion: 1,
  currentOwner: 'usr_sec_1',
  operationalStatus: 'ACTIVE',
  priority: VosPriority.NORMAL,
  riskLevel: VosRiskLevel.LOW,
  riskScore: 10,
  riskReason: 'Routine preventive maintenance schedule',
  sourceSystem: 'TMSA',
  syncStatus: 'SYNCED',
  syncVersion: 1,
  lastSyncedAt: new Date().toISOString(),
  externalReference: 'EXT-REF-1001',
  dataClassification: DataClassification.INTERNAL,
  gateInTime: new Date().toISOString(),
  isClosed: false,
  // Immutable Vehicle Snapshot
  registrationNumber: 'MH12AB1234',
  chassisNumber: 'MAT612045N1234567',
  engineNumber: 'ENG987654321',
  vehicleModel: 'Prima 5530.S',
  vehicleVariant: 'Cabin AC High Deck',
  fuelType: 'DIESEL',
  emissionNorm: 'BS6_STAGE_2',
  manufacturingYear: 2024,
  odometerAtGateIn: 45200,
  warrantyStatusAtGateIn: 'UNDER_WARRANTY',
  oemServicePlan: 'AMC_PLATINUM_PRO',
  // Immutable Driver Snapshot
  driverName: 'Ramesh Kumar',
  driverMobile: '+919876543210',
  driverLicenseNumber: 'MH1220200012345',
  driverType: 'COMMERCIAL_DRIVER',
  // Immutable Customer Snapshot
  customerName: 'Western Freight Logistics Pvt Ltd',
  fleetName: 'Western Fleet Alpha',
  contactPerson: 'Suresh Patel',
  gstNumber: '27AAAAA0000A1Z5',
  customerType: 'FLEET_OWNER',
  fleetSize: 45,
  // Audit Columns
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'usr_sec_1',
  updatedBy: 'usr_sec_1',
  version: 1,
  isDeleted: false
};

export const seedVosStateHistory: IVosStateHistory = {
  id: 'b0000000-0000-4000-8000-000000000001',
  publicId: 'PUB-SH-1001',
  vosId: seedVosRecord.id,
  fromState: 'SYSTEM_INIT',
  toState: 'GATE_IN',
  timeSpentSeconds: 0,
  changedBy: 'usr_sec_1',
  changedByRole: 'security_agent',
  transitionReason: 'Vehicle ANPR camera capture at workshop gate',
  createdAt: new Date().toISOString()
};

export const seedVosOwnerHistory: IVosOwnerHistory = {
  id: 'c0000000-0000-4000-8000-000000000001',
  publicId: 'PUB-OH-1001',
  vosId: seedVosRecord.id,
  previousOwner: 'SYSTEM',
  previousOwnerRole: 'SYSTEM',
  newOwner: 'usr_sec_1',
  newOwnerRole: 'security_agent',
  handoverType: HandoverType.AUTOMATIC,
  transferredBy: 'SYSTEM',
  handoverNotes: 'ANPR Gate In automatic intake assignment',
  createdAt: new Date().toISOString()
};

export const seedVosTimeline: IVosTimeline = {
  id: 'd0000000-0000-4000-8000-000000000001',
  publicId: 'PUB-TL-1001',
  vosId: seedVosRecord.id,
  timelineCategory: TimelineCategory.OPERATIONAL,
  eventType: 'GATE_IN_COMPLETED',
  title: 'Vehicle Gate Entry Registered',
  description: 'ANPR captured VRN MH12AB1234 at Gate 1',
  structuredMetadataJson: JSON.stringify({ camera: 'CAM_GATE_1', confidence: 0.98 }),
  recordedAt: new Date().toISOString(),
  slaStatus: SlaStatus.ON_TRACK
};

export const seedVosConfigRef: IVosConfigurationReference = {
  id: 'e0000000-0000-4000-8000-000000000001',
  publicId: 'PUB-CFG-1001',
  vosId: seedVosRecord.id,
  branchId: 'BR-MUMBAI-CENTRAL',
  configVersion: 'CFG-v1.1.0',
  workflowVersion: 'WF-WOS-v2.0',
  businessRuleVersion: 'BR-2026.1',
  rulesetSnapshotJson: JSON.stringify({ maxIntakeTimeMinutes: 15, requireOdmRead: true }),
  createdAt: new Date().toISOString()
};

export const seedVosLink: IVosLink = {
  id: 'f0000000-0000-4000-8000-000000000001',
  publicId: 'PUB-LNK-1001',
  vosId: seedVosRecord.id,
  entityModule: EntityModule.CRM,
  entityType: 'CRM_LEAD',
  entityId: 'crm_lead_889900',
  relationshipType: RelationshipType.PRIMARY,
  linkedBy: 'usr_sec_1',
  linkedAt: new Date().toISOString(),
  isDeleted: false
};

export const seedVosAttribute: IVosAttribute = {
  id: 'g0000000-0000-4000-8000-000000000001',
  publicId: 'PUB-ATR-1001',
  vosId: seedVosRecord.id,
  attributeName: 'engine_oil_level',
  attributeValue: 'NORMAL',
  attributeType: AttributeType.STRING,
  unit: 'level',
  confidenceScore: 0.95,
  source: AttributeSource.IOT_TELEMATICS,
  capturedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  createdBy: 'IOT_GATEWAY'
};

export const seedVosTag: IVosTag = {
  id: 'h0000000-0000-4000-8000-000000000001',
  publicId: 'PUB-TAG-1001',
  vosId: seedVosRecord.id,
  tagName: 'EXPRESS_SERVICE',
  tagCategory: 'SERVICE_PRIORITY',
  createdBy: 'usr_sec_1',
  createdAt: new Date().toISOString()
};
