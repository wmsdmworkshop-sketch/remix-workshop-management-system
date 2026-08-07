/**
 * DWIP Enterprise Integration Gateway - Types & Domain Models
 * Designated Architecture: DWIP-INT-ARCH-001 v1.0
 */

export enum SyncState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  WAITING_RETRY = 'WAITING_RETRY',
  CONFLICT = 'CONFLICT',
  BLOCKED = 'BLOCKED'
}

export enum PriorityLevel {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BACKGROUND = 5
}

export enum ConflictPolicy {
  SERVER_WINS = 'SERVER_WINS',
  CLIENT_WINS = 'CLIENT_WINS',
  LATEST_TIMESTAMP = 'LATEST_TIMESTAMP',
  MANUAL_APPROVAL = 'MANUAL_APPROVAL'
}

export interface ProviderCapabilities {
  authentication: boolean;
  masterData: boolean;
  vehicle: boolean;
  serviceRequest: boolean;
  jobCard: boolean;
  crm: boolean;
  mediaUpload: boolean;
  kyc: boolean;
  trailerAxle: boolean;
  genset: boolean;
  inventory: boolean;
}

export interface IntegrationProviderConfig {
  providerId: string;
  baseUrl: string;
  authType: 'OAuth2' | 'Bearer' | 'ApiKey' | 'Basic';
  timeoutMs: number;
  retryCount: number;
  certificatePolicy: 'STRICT_TLS_PINNING' | 'SYSTEM_TLS';
  apiVersion: 'v1' | 'v2';
  enabledModules: string[];
  capabilities: ProviderCapabilities;
}

export interface GatewayTraceContext {
  traceId: string;
  correlationId: string;
  parentOperationId?: string;
  operationId: string;
  requestId: string;
}

export interface IntegrationAuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
  systemCode: string;
  metadata?: Record<string, any>;
}

export type SyncStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface DwipVehicle {
  id: string;
  vin: string;
  registrationNumber: string;
  make: string;
  model: string;
  variant?: string;
  modelYear?: number;
  odometerKm?: number;
  fuelType?: string;
  sourceSystem: string;
  sourceRecordId: string;
  lastSyncTime: string;
  syncStatus: SyncStatus;
  version: number;
  checksum: string;
  createdAt: string;
  updatedAt: string;
}

export interface DwipCustomer {
  id: string;
  customerCode: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  city?: string;
  state?: string;
  customerType: 'INDIVIDUAL' | 'CORPORATE' | 'FLEET';
  sourceSystem: string;
  sourceRecordId: string;
  lastSyncTime: string;
  syncStatus: SyncStatus;
  version: number;
  checksum: string;
  createdAt: string;
  updatedAt: string;
}

export interface DwipJobCard {
  id: string;
  jobCardNumber: string;
  vehicleId: string;
  vin: string;
  registrationNumber: string;
  customerId: string;
  customerName: string;
  serviceType: string;
  status: 'OPEN' | 'WIP' | 'QC_PENDING' | 'READY' | 'CLOSED';
  estimatedCost: number;
  complaints: any[];
  sourceSystem: string;
  sourceRecordId: string;
  lastSyncTime: string;
  syncStatus: SyncStatus;
  version: number;
  checksum: string;
  createdAt: string;
  updatedAt: string;
}

export interface DwipGateEntry {
  id: string;
  gatePassNumber: string;
  registrationNumber: string;
  entryTime: string;
  purpose: string;
  status: 'INSIDE' | 'EXITED';
  sourceSystem: string;
  sourceRecordId: string;
  lastSyncTime: string;
  syncStatus: SyncStatus;
  version: number;
  checksum: string;
  createdAt: string;
  updatedAt: string;
}

export interface DwipWarranty {
  id: string;
  claimNumber: string;
  jobCardId: string;
  vehicleVin: string;
  claimAmount: number;
  claimStatus: string;
  sourceSystem: string;
  sourceRecordId: string;
  lastSyncTime: string;
  syncStatus: SyncStatus;
  version: number;
  checksum: string;
  createdAt: string;
  updatedAt: string;
}

export interface DwipMedia {
  id: string;
  entityType: 'JOB_CARD' | 'GATE_ENTRY' | 'VEHICLE' | 'CLAIM';
  entityId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  fileName: string;
  mimeType: string;
  storageUrl: string;
  fileSizeBytes: number;
  uploadedBy: string;
  sourceSystem: string;
  sourceRecordId: string;
  lastSyncTime: string;
  syncStatus: SyncStatus;
  version: number;
  checksum: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealthReport {
  systemCode: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  latencyMs: number;
  lastChecked: string;
  activeEndpoint: string;
  details?: Record<string, any>;
}

export interface IntegrationQueueItem {
  id: string;
  providerId: string;
  entityType: string;
  operation: string;
  serializedPayload: string;
  headers: Record<string, string>;
  priority: PriorityLevel;
  syncState: SyncState;
  retryCount: number;
  correlationId: string;
  idempotencyKey?: string;
  checksum: string;
  createdTimestamp: string;
}

export interface SyncHistoryItem {
  id: string;
  batchId: string;
  providerId: string;
  syncMode: 'FULL' | 'INCREMENTAL' | 'MANUAL' | 'BACKGROUND';
  entityType?: string;
  recordsProcessed: number;
  recordsFailed: number;
  status: SyncState;
  startedAt: string;
  completedAt?: string;
  errorLog?: string[];
}

export interface ApiAuditLogItem {
  id: string;
  traceId: string;
  correlationId: string;
  providerId: string;
  endpoint: string;
  httpMethod: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseStatusCode: number;
  responseBody?: string;
  durationMs: number;
  timestamp: string;
}
