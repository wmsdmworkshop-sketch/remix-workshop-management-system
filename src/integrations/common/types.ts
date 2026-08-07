/**
 * DWIP Enterprise - Integration Layer Common Types & Standardized Interfaces
 * Sprint IL-001 Architecture
 * 
 * Strict Isolation Rule: No Tata-specific field names or vendor structures.
 * Business modules consume ONLY normalized DWIP domain models.
 */

// =============================================================================
// SYNCHRONIZATION METADATA CONTRACT
// =============================================================================

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED' | 'RETRYING' | 'CONFLICT' | 'SKIPPED';

export interface ISyncableEntity {
  sourceSystem: string;
  sourceRecordId: string;
  lastSyncTime: Date | string;
  syncStatus: SyncStatus;
  version: number;
  checksum: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// =============================================================================
// DWIP NORMALIZED DOMAIN MODELS
// =============================================================================

export interface DwipVehicle extends ISyncableEntity {
  id: string;
  vin: string;
  registrationNumber: string;
  make: string;
  model: string;
  variant?: string;
  modelYear?: number;
  color?: string;
  engineNumber?: string;
  chassisNumber?: string;
  odometerKm?: number;
  fuelType?: 'PETROL' | 'DIESEL' | 'EV' | 'CNG' | 'HYBRID' | 'OTHER';
  customerOwnerId?: string;
  warrantyStatus?: 'ACTIVE' | 'EXPIRED' | 'VOID' | 'PENDING';
  warrantyEndDate?: string;
  telematicsEnabled?: boolean;
}

export interface DwipCustomer extends ISyncableEntity {
  id: string;
  customerCode: string;
  fullName: string;
  email?: string;
  phoneNumber: string;
  alternatePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  customerType: 'INDIVIDUAL' | 'CORPORATE' | 'FLEET' | 'GOVERNMENT';
  taxIdentificationNumber?: string;
}

export interface DwipComplaint extends ISyncableEntity {
  id: string;
  code: string;
  category: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  customerReportedAt: string;
  status: 'OPEN' | 'DIAGNOSED' | 'RESOLVED' | 'CLOSED';
}

export interface DwipJobCard extends ISyncableEntity {
  id: string;
  jobCardNumber: string;
  vehicleId: string;
  vin: string;
  registrationNumber: string;
  customerId: string;
  customerName: string;
  advisorId?: string;
  advisorName?: string;
  serviceType: string;
  status: 'GATE_IN' | 'DIAGNOSTIC' | 'ESTIMATE_APPROVED' | 'WIP' | 'QC' | 'BILLING' | 'DELIVERED' | 'CANCELLED';
  estimatedCost?: number;
  finalAmount?: number;
  promisedDeliveryTime?: string;
  actualDeliveryTime?: string;
  complaints: DwipComplaint[];
}

export interface DwipWarranty extends ISyncableEntity {
  id: string;
  claimNumber: string;
  jobCardId: string;
  vehicleVin: string;
  partNumber?: string;
  partDescription?: string;
  claimAmount: number;
  approvedAmount?: number;
  claimStatus: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectionReason?: string;
  submissionDate?: string;
}

export interface DwipGateEntry extends ISyncableEntity {
  id: string;
  gatePassNumber: string;
  registrationNumber: string;
  vin?: string;
  driverName?: string;
  driverPhone?: string;
  entryTime: string;
  exitTime?: string;
  purpose: 'SERVICE' | 'REPAIR' | 'BODYSHOP' | 'INSPECTION' | 'OTHER';
  status: 'INSIDE' | 'COMPLETED' | 'CANCELLED';
  securityAgentId?: string;
}

export interface DwipMedia extends ISyncableEntity {
  id: string;
  entityType: 'JOB_CARD' | 'GATE_ENTRY' | 'WARRANTY' | 'VEHICLE_INSPECTION';
  entityId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';
  fileName: string;
  mimeType: string;
  storageUrl: string;
  thumbnailUrl?: string;
  fileSizeBytes: number;
  uploadedBy: string;
}

// =============================================================================
// STANDARDIZED INTEGRATION SERVICES CONTRACTS
// =============================================================================

export interface IntegrationAuthSession {
  token: string;
  expiresAt: Date;
  tokenType: string;
  systemCode: string;
  metadata?: Record<string, any>;
}

export interface IAuthenticationService {
  authenticate(): Promise<IntegrationAuthSession>;
  refreshToken(currentToken: string): Promise<IntegrationAuthSession>;
  validateSession(sessionToken: string): Promise<boolean>;
  logout(): Promise<void>;
}

export interface IVehicleService {
  getVehicleByVin(vin: string): Promise<DwipVehicle | null>;
  getVehicleByRegistration(registrationNumber: string): Promise<DwipVehicle | null>;
  syncVehicle(vehicle: Partial<DwipVehicle>): Promise<DwipVehicle>;
}

export interface ICustomerService {
  getCustomerById(customerId: string): Promise<DwipCustomer | null>;
  getCustomerByPhone(phoneNumber: string): Promise<DwipCustomer | null>;
  syncCustomer(customer: Partial<DwipCustomer>): Promise<DwipCustomer>;
}

export interface IJobCardService {
  getJobCardById(jobCardId: string): Promise<DwipJobCard | null>;
  syncJobCard(jobCard: Partial<DwipJobCard>): Promise<DwipJobCard>;
  updateJobCardStatus(jobCardId: string, status: DwipJobCard['status']): Promise<boolean>;
}

export interface IGateEntryService {
  getGateEntryById(gateEntryId: string): Promise<DwipGateEntry | null>;
  syncGateEntry(gateEntry: Partial<DwipGateEntry>): Promise<DwipGateEntry>;
  markGateOut(gateEntryId: string, exitTime: string): Promise<boolean>;
}

export interface IWarrantyService {
  getWarrantyClaim(claimNumber: string): Promise<DwipWarranty | null>;
  submitWarrantyClaim(claim: Partial<DwipWarranty>): Promise<DwipWarranty>;
  checkWarrantyEligibility(vin: string, partNumber: string): Promise<{ eligible: boolean; reason?: string }>;
}

export interface IMediaService {
  uploadMedia(media: Partial<DwipMedia>, fileBuffer: Uint8Array): Promise<DwipMedia>;
  getMediaByEntity(entityType: DwipMedia['entityType'], entityId: string): Promise<DwipMedia[]>;
  deleteMedia(mediaId: string): Promise<boolean>;
}

export interface IMasterSyncService {
  triggerFullSync(entityType?: string): Promise<{ batchId: string; totalRecords: number; status: SyncStatus }>;
  getSyncProgress(batchId: string): Promise<{ processed: number; total: number; errors: string[]; completed: boolean }>;
}

export interface SystemHealthReport {
  systemCode: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNCONFIGURED';
  latencyMs: number;
  lastChecked: string;
  activeEndpoint: string;
  details?: Record<string, any>;
}

export interface IHealthService {
  checkHealth(): Promise<SystemHealthReport>;
  pingEndpoint(endpoint: string): Promise<{ reachable: boolean; durationMs: number }>;
}

// =============================================================================
// CONNECTOR PLUGIN INTERFACE
// =============================================================================

export interface IIntegrationConnector {
  readonly systemCode: string;
  readonly name: string;
  readonly authService: IAuthenticationService;
  readonly vehicleService: IVehicleService;
  readonly customerService: ICustomerService;
  readonly jobCardService: IJobCardService;
  readonly gateEntryService: IGateEntryService;
  readonly warrantyService: IWarrantyService;
  readonly mediaService: IMediaService;
  readonly masterSyncService: IMasterSyncService;
  readonly healthService: IHealthService;
  
  initialize(config: Record<string, any>): Promise<void>;
  shutdown(): Promise<void>;
}
