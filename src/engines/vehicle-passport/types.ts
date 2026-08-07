/**
 * DWIP Vehicle Passport™ Platform - Type Definitions
 * 
 * Defines the core models, timeline events, evidence structures, 
 * verification levels, health subsystems, and certificate views.
 */

// ─── Enums & Consts ──────────────────────────────────────────────────────────

export type VerificationLevel = 1 | 2 | 3 | 4 | 5;

export const VerificationLevels = {
  UNVERIFIED: 1 as VerificationLevel,
  CUSTOMER_SUBMITTED: 2 as VerificationLevel,
  AI_VERIFIED: 3 as VerificationLevel,
  DEALER_REVIEWED: 4 as VerificationLevel,
  DEALER_VERIFIED: 5 as VerificationLevel,
} as const;

export type PassportStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

export type EventType =
  | "DEALER_SERVICE"
  | "WARRANTY"
  | "AMC"
  | "RECALL"
  | "BREAKDOWN"
  | "ROADSIDE_REPAIR"
  | "LOCAL_WORKSHOP_REPAIR"
  | "FLEET_WORKSHOP_REPAIR"
  | "TYRE_REPLACEMENT"
  | "BATTERY_REPLACEMENT"
  | "WHEEL_ALIGNMENT"
  | "WHEEL_BALANCING"
  | "SUSPENSION_REPAIR"
  | "TURBO_REPLACEMENT"
  | "ENGINE_OVERHAUL"
  | "TRANSMISSION_REPAIR"
  | "BODY_FABRICATION"
  | "HYDRAULIC_INSTALLATION"
  | "PTO_INSTALLATION"
  | "GPS_INSTALLATION"
  | "FASTAG"
  | "INSURANCE_CLAIM"
  | "ACCIDENT"
  | "MAJOR_REPAIR"
  | "MINOR_REPAIR"
  | "INSPECTION"
  | "FITNESS"
  | "PERMIT_RENEWAL"
  | "TAX_RENEWAL"
  | "CUSTOMER_NOTE"
  | "DEALER_NOTE";

export type CertificateType =
  | "VERIFIED_RESALE"
  | "WARRANTY_PASSPORT"
  | "FLEET_PASSPORT"
  | "INSURANCE_PASSPORT"
  | "COMPLIANCE_PASSPORT"
  | "FINANCE_PASSPORT";

export type CertificateStatus = "VALID" | "EXPIRED" | "REVOKED" | "SUPERSEDED";

// ─── Master Vehicle Passport ──────────────────────────────────────────────────

export interface VehiclePassport {
  passportId: string;
  vehicleId: string;
  vin: string;
  engineNo: string;
  registrationNo: string;
  make: string;
  model: string;
  productLine?: string;
  yearOfManufacture: number;
  fuelType: string;
  bodyType: string;
  
  // Historical & Warranty Header Details
  originalSaleDate?: string;
  tmInvoiceDate?: string;
  dateOfRegistration?: string;
  warrantyExpiryDate?: string;
  warrantyExpiryKm?: number;
  warrantyExpiryHours?: number;
  
  passportStatus: PassportStatus;
  passportScore: number; // Composite Score (0-100)
  healthScore: number;   // Engine + Parts Health (0-100)
  trustScore: number;    // Verification Level Distribution (0-100)
  totalEvents: number;
  verifiedEvents: number;
  dealerId: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Events & Timeline ────────────────────────────────────────────────────────

export interface VehicleEvent {
  eventId: string;
  passportId: string;
  eventType: EventType;
  eventSource: "MANUAL" | "SYSTEM" | "MOBILE" | "API" | "AI";
  eventDate: string;
  odometerKm: number;
  description: string;
  verificationLevel: VerificationLevel;
  verifiedBy: string;
  dealerId?: string;
  branchId?: string;
  aiAnalysis?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ─── Evidence & Documents ─────────────────────────────────────────────────────

export interface VehicleDocument {
  documentId: string;
  passportId: string;
  eventId?: string; // Links back to event
  documentType: string; // INVOICE, GST_INVOICE, ALIGNMENT_REPORT, etc.
  provider: string; // The OCR provider used
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  ocrScore: number;
  authenticityScore: number;
  tamperingScore: number;
  aiConfidence: number;
  verificationLevel: VerificationLevel;
  storageReference: string;
  documentHash: string;
  extractedFields: Record<string, string>;
  createdAt: string;
}

// ─── Sub-entities for Detailed History ────────────────────────────────────────

export interface VehicleModification {
  modificationId: string;
  passportId: string;
  eventId: string;
  modificationType: string;
  description: string;
  vendor: string;
  cost: number;
  verificationLevel: VerificationLevel;
  modificationDate: string;
}

export interface VehicleRepair {
  repairId: string;
  passportId: string;
  eventId: string;
  repairType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  workshopName: string;
  workshopType: "DEALER" | "LOCAL" | "FLEET";
  labourCost: number;
  partsCost: number;
  totalCost: number;
  verificationLevel: VerificationLevel;
  repairDate: string;
}

export interface VehicleAccident {
  accidentId: string;
  passportId: string;
  eventId: string;
  severity: "MINOR" | "MODERATE" | "SEVERE" | "TOTAL_LOSS";
  description: string;
  insuranceClaimNo?: string;
  claimStatus?: string;
  claimAmount?: number;
  verificationLevel: VerificationLevel;
  accidentDate: string;
}

export interface VehiclePartHistory {
  partId: string;
  passportId: string;
  eventId: string;
  partName: string;
  partNumber: string;
  partType: string;
  brand: string;
  cost: number;
  warrantyMonths: number;
  verificationLevel: VerificationLevel;
  installedDate: string;
}

export interface VehicleOwnershipHistory {
  ownershipId: string;
  passportId: string;
  ownerName: string;
  ownerType: "INDIVIDUAL" | "FLEET" | "DEALER" | "LEASING";
  contact: string;
  ownershipStart: string;
  ownershipEnd?: string;
  transferMethod: string;
  verificationLevel: VerificationLevel;
}

// ─── AI Health Engine Outputs ────────────────────────────────────────────────

export interface SubsystemHealth {
  score: number;
  reasoning: string;
  lastChecked: string;
  activeIssues: string[];
}

export interface VehicleHealthReport {
  overallScore: number;
  engine: SubsystemHealth;
  transmission: SubsystemHealth;
  brake: SubsystemHealth;
  suspension: SubsystemHealth;
  electrical: SubsystemHealth;
  cooling: SubsystemHealth;
  tyre: SubsystemHealth;
  cabin: SubsystemHealth;
  updatedAt: string;
}

// ─── Certificates (Generated Passport Views) ──────────────────────────────────

export interface PassportCertificate {
  certificateId: string;
  passportId: string;
  certificateType: CertificateType;
  certificateStatus: CertificateStatus;
  qrCode: string; // Format: DWIP-RP-YYYY-XXXXXXXX
  digitalSignature: string;
  certificateHash: string;
  healthSnapshot: VehicleHealthReport;
  trustSnapshot: {
    trustScore: number;
    totalEvents: number;
    verificationDistribution: Record<VerificationLevel, number>;
  };
  passportScoreAtGeneration: number;
  generatedBy: string;
  tier: "FREE" | "PREMIUM";
  generatedAt: string;
  expiresAt: string;
  revokedAt?: string;
  viewSpecificData: Record<string, any>; // Dynamic data depending on view type (e.g. valuation, warranty terms)
}

// ─── Provider Interfaces ─────────────────────────────────────────────────────

export interface HealthAnalysisProvider {
  readonly providerId: string;
  analyzeHealth(events: VehicleEvent[], repairs: VehicleRepair[], parts: VehiclePartHistory[], accidents: VehicleAccident[]): Promise<VehicleHealthReport>;
}

export interface CertificateSigningProvider {
  readonly providerId: string;
  sign(data: Record<string, any>): Promise<{ signature: string; hash: string }>;
  verifySignature(hash: string, signature: string): Promise<boolean>;
}

export interface TrustScoringProvider {
  readonly providerId: string;
  computeScores(
    passport: VehiclePassport,
    events: VehicleEvent[],
    documents: VehicleDocument[],
    healthReport: VehicleHealthReport
  ): Promise<{ trustScore: number; passportScore: number }>;
}

// ─── 360° Operational Dossier Aggregate ────────────────────────────────────────

export interface LifetimeVehicleSummary {
  lifetimeSpend: number;
  totalVisits: number;
  labourSparesRatio: string; // e.g. "35% Labour / 65% Spares"
  repeatRepairIndex: number; // percentage
  repeatBreakdownsCount: number;
  activeWarrantyStatus: string;
  activeAmcStatus: string;
  avgStayDurationHours: number;
}

export interface VisitKpis {
  stayDurationHours: number;
  activeRepairHours: number;
  isRepeatRepair: boolean;
  repeatRepairReason?: string;
  slaStatus: "WITHIN_SLA" | "WARN" | "BREACHED";
  delayReason?: string;
  qcResult: "PASS" | "FAIL" | "OVERRIDE" | "PENDING";
}

export interface FinancialJourney {
  initialEstimateAmount: number;
  approvedAddendumsAmount: number;
  finalInvoiceAmount: number;
  warrantyOffsetAmount: number;
  amcOffsetAmount: number;
  goodwillOffsetAmount: number;
  netSettledAmount: number;
  journeyStatus: "ESTIMATED" | "APPROVED" | "INVOICED" | "SETTLED";
}

export interface CommercialBillingBreakdown {
  grossLabourAmount: number;
  grossSparesAmount: number;
  consumablesFee: number;
  auxiliaryCharges: number;
  taxAmount: number;
  discountAmount: number;
  warrantyCreditOffset: number;
  amcCreditOffset: number;
  goodwillConcessionOffset: number;
  finalConsolidatedInvoiceAmount: number;
}

export interface VisitQuickActions {
  jobCardPdfUrl?: string;
  gatePassUrl?: string;
  taxInvoiceUrl?: string;
  qcReportUrl?: string;
  evidenceUrls?: string[];
}

export interface VisitLedgerEntry {
  visitId: string; // Job Card ID / SR No
  serviceRequestNo?: string;
  jobCardNo: string;
  invoiceNo?: string;
  isInvoiceGenerated?: boolean;
  serviceType?: string;
  visitStatus: string; // IN_PROGRESS, INVOICED, COMPLETED, DELIVERED
  workshopName: string;
  serviceAdvisor: string;
  bayNo?: string;
  
  // Timestamps
  gateInTime: string;
  workStartedTime?: string;
  qcCompletedTime?: string;
  gateOutTime?: string;
  odometerKm: number;

  // Operational KPIs
  kpis: VisitKpis;

  // Core Scope & Diagnostics
  complaints: string[];
  diagnosticSummary?: string;

  // Parts & Labour Details
  parts: Array<{
    partNumber: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  labour: Array<{
    jobCode?: string;
    description: string;
    hoursSpent?: number;
    amount: number;
  }>;

  // Commercial & Financials
  financialJourney: FinancialJourney;
  commercialBilling: CommercialBillingBreakdown;

  // Coverage & Concessions
  warrantyClaim?: { claimNo: string; status: string; approvedAmount: number };
  amcCoverage?: { planName: string; coveredAmount: number };
  fsbCampaign?: { campaignId: string; campaignName: string; status: string };
  goodwillConcession?: { requestId: string; approvedAmount: number; reason: string };

  // Documents
  quickActions: VisitQuickActions;
}

export interface VehiclePassportAggregate {
  passport: VehiclePassport;
  customer: {
    customerId: string;
    customerName: string;
    customerMobile: string;
    accountType: string;
    city?: string;
  };
  lifetimeSummary: LifetimeVehicleSummary;
  healthReport: VehicleHealthReport;
  visitLedger: VisitLedgerEntry[];
}

