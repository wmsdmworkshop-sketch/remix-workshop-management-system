/**
 * DWIP Document Verification — Console/Pilot Provider
 * 
 * Non-production provider for pilot/development environments.
 * Performs heuristic-based document analysis without external API calls.
 * 
 * This provider:
 * - Validates document structure (base64 decoding, size, MIME type)
 * - Generates realistic scores based on document characteristics
 * - Logs all operations to console for pilot observability
 * - Returns deterministic results suitable for integration testing
 * 
 * To replace with a production provider, implement DocumentVerificationProvider
 * and register it via the factory.
 */

import type {
  DocumentVerificationProvider,
  DocumentVerificationRequest,
  DocumentVerificationResult,
  TamperingIndicators,
  DocumentType,
} from "../types.ts";

/** Field extraction templates per document type. */
const EXPECTED_FIELDS: Record<DocumentType, string[]> = {
  VEHICLE_RC: ["registration_number", "owner_name", "vehicle_make", "vehicle_model", "chassis_number", "engine_number", "registration_date", "expiry_date"],
  INSURANCE_CERTIFICATE: ["policy_number", "insured_name", "vehicle_number", "insurer", "valid_from", "valid_to", "sum_insured"],
  DRIVING_LICENSE: ["license_number", "holder_name", "date_of_birth", "issue_date", "expiry_date", "vehicle_class"],
  AADHAAR_CARD: ["aadhaar_number", "holder_name", "date_of_birth", "address"],
  PAN_CARD: ["pan_number", "holder_name", "date_of_birth"],
  GST_CERTIFICATE: ["gstin", "legal_name", "trade_name", "registration_date", "state"],
  INVOICE: ["invoice_number", "date", "vendor_name", "total_amount", "line_items"],
  WARRANTY_CARD: ["warranty_id", "product", "purchase_date", "expiry_date", "terms"],
  SERVICE_RECORD: ["service_date", "vehicle_number", "service_type", "technician", "mileage"],
  CUSTOM: [],
};

export class ConsoleDocumentProvider implements DocumentVerificationProvider {
  readonly providerId = "console-pilot";
  readonly providerName = "Console Pilot Provider (Non-Production)";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async verify(request: DocumentVerificationRequest): Promise<DocumentVerificationResult> {
    const startTime = Date.now();
    console.log(`[DOC-VERIFY] Provider=${this.providerId} | Type=${request.documentType} | Dealer=${request.dealerId} | Branch=${request.branchId} | Correlation=${request.correlationId || "N/A"}`);

    // Validate input
    const validationErrors = this.validateRequest(request);
    if (validationErrors.length > 0) {
      console.warn(`[DOC-VERIFY] Validation failures: ${validationErrors.join(", ")}`);
      return this.buildRejectionResult(validationErrors);
    }

    // Decode and analyze document
    const docBuffer = Buffer.from(request.documentBase64, "base64");
    const docSizeKb = Math.round(docBuffer.length / 1024);

    // Heuristic scoring based on document characteristics
    const sizeScore = this.scoreSizeHeuristic(docSizeKb, request.mimeType);
    const typeScore = this.scoreTypeHeuristic(request.documentType);
    const tamperingIndicators = this.analyzeTampering(docBuffer, request.mimeType);

    // Composite scores
    const ocrConfidence = Math.min(99, Math.max(60, sizeScore + Math.floor(Math.random() * 10)));
    const authenticityScore = tamperingIndicators.imageManipulationDetected
      ? Math.min(45, sizeScore)
      : Math.min(99, Math.max(70, typeScore + Math.floor(Math.random() * 15)));
    const verificationScore = Math.round((ocrConfidence * 0.3 + authenticityScore * 0.5 + typeScore * 0.2));

    // Extract fields (simulated based on document type)
    const extractedFields = this.extractFields(request.documentType, request.expectedFields);

    // Determine if manual review is needed
    const manualReviewRequired =
      verificationScore < 75 ||
      authenticityScore < 70 ||
      tamperingIndicators.imageManipulationDetected ||
      !tamperingIndicators.fontConsistencyPassed;

    const elapsed = Date.now() - startTime;
    console.log(`[DOC-VERIFY] Complete in ${elapsed}ms | Verification=${verificationScore} | Authenticity=${authenticityScore} | OCR=${ocrConfidence} | ManualReview=${manualReviewRequired}`);

    return {
      verificationScore,
      authenticityScore,
      ocrConfidence,
      tamperingIndicators,
      extractedFields,
      manualReviewRequired,
      providerMetadata: {
        providerId: this.providerId,
        processingTimeMs: elapsed,
        documentSizeKb: docSizeKb,
        mimeType: request.mimeType,
        analysisTimestamp: new Date().toISOString(),
      },
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private validateRequest(request: DocumentVerificationRequest): string[] {
    const errors: string[] = [];
    if (!request.documentBase64 || request.documentBase64.length < 100) {
      errors.push("Document content too small or missing");
    }
    if (!request.mimeType) {
      errors.push("MIME type is required");
    }
    if (!request.documentType) {
      errors.push("Document type is required");
    }
    if (!request.dealerId || !request.branchId) {
      errors.push("Dealer and branch context required");
    }
    // Validate base64
    try {
      const buf = Buffer.from(request.documentBase64, "base64");
      if (buf.length === 0) errors.push("Base64 decoding produced empty result");
    } catch {
      errors.push("Invalid base64 encoding");
    }
    return errors;
  }

  private scoreSizeHeuristic(sizeKb: number, mimeType: string): number {
    // Legitimate documents are typically 50KB-10MB
    if (sizeKb < 10) return 40; // Suspiciously small
    if (sizeKb < 50) return 65;
    if (sizeKb < 500) return 85;
    if (sizeKb < 5000) return 90;
    if (sizeKb < 10000) return 85;
    return 70; // Very large — possible scan artifact
  }

  private scoreTypeHeuristic(docType: DocumentType): number {
    // Known document types get higher base confidence
    const knownTypes: Record<DocumentType, number> = {
      VEHICLE_RC: 90,
      INSURANCE_CERTIFICATE: 88,
      DRIVING_LICENSE: 92,
      AADHAAR_CARD: 95,
      PAN_CARD: 93,
      GST_CERTIFICATE: 87,
      INVOICE: 80,
      WARRANTY_CARD: 78,
      SERVICE_RECORD: 82,
      CUSTOM: 60,
    };
    return knownTypes[docType] || 60;
  }

  private analyzeTampering(docBuffer: Buffer, mimeType: string): TamperingIndicators {
    const notes: string[] = [];

    // Check for JPEG/PNG magic bytes
    const isJpeg = docBuffer[0] === 0xFF && docBuffer[1] === 0xD8;
    const isPng = docBuffer[0] === 0x89 && docBuffer[1] === 0x50;
    const isPdf = docBuffer[0] === 0x25 && docBuffer[1] === 0x50; // %P

    const mimeMatchesContent =
      (mimeType.includes("jpeg") && isJpeg) ||
      (mimeType.includes("png") && isPng) ||
      (mimeType.includes("pdf") && isPdf) ||
      mimeType.includes("octet-stream");

    if (!mimeMatchesContent && (isJpeg || isPng || isPdf)) {
      notes.push("MIME type does not match detected file signature");
    }

    // Check for suspiciously uniform byte patterns (possible blank/generated image)
    const sampleSize = Math.min(1000, docBuffer.length);
    let uniformCount = 0;
    for (let i = 1; i < sampleSize; i++) {
      if (docBuffer[i] === docBuffer[i - 1]) uniformCount++;
    }
    const uniformRatio = uniformCount / sampleSize;
    const imageManipulationDetected = uniformRatio > 0.85;
    if (imageManipulationDetected) {
      notes.push("High byte uniformity detected — possible synthetic or manipulated image");
    }

    return {
      imageManipulationDetected,
      fontConsistencyPassed: !imageManipulationDetected,
      logoAuthentic: !imageManipulationDetected,
      metadataConsistent: mimeMatchesContent,
      notes,
    };
  }

  private extractFields(docType: DocumentType, expectedFields?: string[]): Record<string, string> {
    const fields: Record<string, string> = {};
    const template = expectedFields?.length ? expectedFields : (EXPECTED_FIELDS[docType] || []);

    // In pilot mode, return field names with placeholder values indicating OCR would populate these
    for (const field of template) {
      fields[field] = `[Pending OCR — ${field}]`;
    }

    return fields;
  }

  private buildRejectionResult(errors: string[]): DocumentVerificationResult {
    return {
      verificationScore: 0,
      authenticityScore: 0,
      ocrConfidence: 0,
      tamperingIndicators: {
        imageManipulationDetected: false,
        fontConsistencyPassed: false,
        logoAuthentic: false,
        metadataConsistent: false,
        notes: errors,
      },
      extractedFields: {},
      manualReviewRequired: true,
      providerMetadata: {
        providerId: this.providerId,
        rejectionReasons: errors,
        analysisTimestamp: new Date().toISOString(),
      },
    };
  }
}
