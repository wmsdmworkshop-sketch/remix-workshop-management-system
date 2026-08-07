/**
 * DWIP Document Verification Framework — Types & Interfaces
 * 
 * Provider-agnostic abstraction for document verification.
 * Supports pluggable backends: Google Vision, Azure Document Intelligence,
 * AWS Textract, or any future provider.
 * 
 * Architecture Rule: Never hardcode vendor-specific logic outside a provider implementation.
 */

// ─── Core Result Types ───────────────────────────────────────────────────────

export interface DocumentVerificationResult {
  /** Overall verification score (0-100). Composite of all sub-scores. */
  verificationScore: number;
  /** Authenticity confidence (0-100). Likelihood the document is genuine. */
  authenticityScore: number;
  /** OCR text extraction confidence (0-100). */
  ocrConfidence: number;
  /** Tampering analysis indicators. */
  tamperingIndicators: TamperingIndicators;
  /** Fields extracted from the document via OCR/AI. */
  extractedFields: Record<string, string>;
  /** Whether a human reviewer must validate this document. */
  manualReviewRequired: boolean;
  /** Provider-specific metadata (e.g., request IDs, model versions). */
  providerMetadata: Record<string, unknown>;
}

export interface TamperingIndicators {
  /** Whether image manipulation was detected (e.g., Photoshop, pixel editing). */
  imageManipulationDetected: boolean;
  /** Whether font/text overlays appear inconsistent with the original document. */
  fontConsistencyPassed: boolean;
  /** Whether official logos/watermarks match known genuine templates. */
  logoAuthentic: boolean;
  /** Whether metadata (EXIF, creation timestamps) appear consistent. */
  metadataConsistent: boolean;
  /** Free-text notes from the provider about tampering analysis. */
  notes: string[];
}

// ─── Document Types ──────────────────────────────────────────────────────────

export type DocumentType =
  | "VEHICLE_RC"
  | "INSURANCE_CERTIFICATE"
  | "DRIVING_LICENSE"
  | "AADHAAR_CARD"
  | "PAN_CARD"
  | "GST_CERTIFICATE"
  | "INVOICE"
  | "WARRANTY_CARD"
  | "SERVICE_RECORD"
  | "CUSTOM";

// ─── Verification Request ────────────────────────────────────────────────────

export interface DocumentVerificationRequest {
  /** The document content — base64-encoded image or PDF. */
  documentBase64: string;
  /** MIME type of the document (e.g., "image/jpeg", "application/pdf"). */
  mimeType: string;
  /** The type of document being verified. */
  documentType: DocumentType;
  /** Multi-tenant context. */
  dealerId: string;
  branchId: string;
  /** Optional correlation ID for audit trail linkage. */
  correlationId?: string;
  /** Optional hints about expected fields to extract. */
  expectedFields?: string[];
}

// ─── Document Passport ───────────────────────────────────────────────────────

export interface DocumentPassport {
  /** Unique identifier for this passport record. */
  passportId: string;
  /** Link to the customer passport. */
  customerPassportId: string;
  /** Document classification. */
  documentType: DocumentType;
  /** SHA-256 hash of the original document bytes for integrity verification. */
  documentHash: string;
  /** Verification result snapshot at time of creation. */
  verification: DocumentVerificationResult;
  /** Status of the document passport. */
  status: DocumentPassportStatus;
  /** Version history — each re-verification or update appends here. */
  versionHistory: DocumentPassportVersion[];
  /** ISO timestamp of creation. */
  createdAt: string;
  /** ISO timestamp of last update. */
  updatedAt: string;
  /** Multi-tenant context. */
  dealerId: string;
  branchId: string;
}

export type DocumentPassportStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "MANUAL_REVIEW"
  | "EXPIRED";

export interface DocumentPassportVersion {
  version: number;
  verifiedAt: string;
  verifiedBy: string;
  result: DocumentVerificationResult;
  notes: string;
}

// ─── Provider Interface ──────────────────────────────────────────────────────

/**
 * All document verification providers MUST implement this interface.
 * 
 * To add a new provider:
 * 1. Create a class in `providers/` that implements DocumentVerificationProvider.
 * 2. Register it in the factory via `registerProvider()`.
 */
export interface DocumentVerificationProvider {
  /** Unique identifier for this provider (e.g., "google-vision", "azure-di", "aws-textract"). */
  readonly providerId: string;
  /** Human-readable name. */
  readonly providerName: string;
  /** Whether this provider is currently available/configured. */
  isAvailable(): Promise<boolean>;
  /** Execute document verification. */
  verify(request: DocumentVerificationRequest): Promise<DocumentVerificationResult>;
}
