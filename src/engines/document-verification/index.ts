/**
 * DWIP Document Verification — Provider Factory & Registry
 * 
 * Central entry point for document verification operations.
 * Manages provider registration, selection, and Document Passport lifecycle.
 * 
 * Usage:
 *   import { documentVerificationService } from "./src/engines/document-verification/index.ts";
 *   const result = await documentVerificationService.verify(request);
 *   const passport = await documentVerificationService.createPassport(customerPassportId, docType, docBase64, result, dealerId, branchId);
 */

import crypto from "crypto";
import type {
  DocumentVerificationProvider,
  DocumentVerificationRequest,
  DocumentVerificationResult,
  DocumentPassport,
  DocumentPassportStatus,
  DocumentType,
} from "./types.ts";
import { ConsoleDocumentProvider } from "./providers/console-provider.ts";

class DocumentVerificationService {
  private providers = new Map<string, DocumentVerificationProvider>();
  private activeProviderId: string;

  constructor() {
    // Register the default pilot provider
    const consoleProvider = new ConsoleDocumentProvider();
    this.providers.set(consoleProvider.providerId, consoleProvider);
    this.activeProviderId = consoleProvider.providerId;
  }

  // ── Provider Management ────────────────────────────────────────────────

  /**
   * Register a new verification provider.
   * Call this at startup to plug in Google Vision, Azure DI, AWS Textract, etc.
   */
  registerProvider(provider: DocumentVerificationProvider): void {
    this.providers.set(provider.providerId, provider);
    console.log(`[DOC-VERIFY] Registered provider: ${provider.providerName} (${provider.providerId})`);
  }

  /**
   * Set the active provider by ID.
   * Falls back to console-pilot if the requested provider is unavailable.
   */
  async setActiveProvider(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      console.warn(`[DOC-VERIFY] Provider '${providerId}' not registered. Available: ${Array.from(this.providers.keys()).join(", ")}`);
      return false;
    }
    const available = await provider.isAvailable();
    if (!available) {
      console.warn(`[DOC-VERIFY] Provider '${providerId}' registered but not available (missing credentials?). Keeping '${this.activeProviderId}'.`);
      return false;
    }
    this.activeProviderId = providerId;
    console.log(`[DOC-VERIFY] Active provider set to: ${provider.providerName}`);
    return true;
  }

  /** Get the active provider instance. */
  getActiveProvider(): DocumentVerificationProvider {
    return this.providers.get(this.activeProviderId)!;
  }

  /** List all registered providers with availability status. */
  async listProviders(): Promise<Array<{ id: string; name: string; active: boolean; available: boolean }>> {
    const result = [];
    for (const [id, provider] of this.providers) {
      result.push({
        id,
        name: provider.providerName,
        active: id === this.activeProviderId,
        available: await provider.isAvailable(),
      });
    }
    return result;
  }

  // ── Verification ───────────────────────────────────────────────────────

  /**
   * Verify a document using the active provider.
   */
  async verify(request: DocumentVerificationRequest): Promise<DocumentVerificationResult> {
    const provider = this.getActiveProvider();
    return provider.verify(request);
  }

  // ── Document Passport Lifecycle ────────────────────────────────────────

  /**
   * Create a Document Passport from a verification result.
   * This is the immutable audit record for the document.
   */
  createPassport(
    customerPassportId: string,
    documentType: DocumentType,
    documentBase64: string,
    verification: DocumentVerificationResult,
    dealerId: string,
    branchId: string,
  ): DocumentPassport {
    const now = new Date().toISOString();
    const documentHash = crypto.createHash("sha256").update(documentBase64).digest("hex");

    // Determine status based on verification result
    let status: DocumentPassportStatus;
    if (verification.verificationScore === 0) {
      status = "REJECTED";
    } else if (verification.manualReviewRequired) {
      status = "MANUAL_REVIEW";
    } else if (verification.verificationScore >= 75 && verification.authenticityScore >= 70) {
      status = "VERIFIED";
    } else {
      status = "PENDING_VERIFICATION";
    }

    return {
      passportId: `DPASS-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      customerPassportId,
      documentType,
      documentHash,
      verification,
      status,
      versionHistory: [
        {
          version: 1,
          verifiedAt: now,
          verifiedBy: `provider:${verification.providerMetadata.providerId || "unknown"}`,
          result: verification,
          notes: `Initial verification via ${verification.providerMetadata.providerId || "unknown"} provider`,
        },
      ],
      createdAt: now,
      updatedAt: now,
      dealerId,
      branchId,
    };
  }
}

// Singleton instance
export const documentVerificationService = new DocumentVerificationService();

// Re-export types for consumer convenience
export type {
  DocumentVerificationProvider,
  DocumentVerificationRequest,
  DocumentVerificationResult,
  DocumentPassport,
  DocumentPassportStatus,
  DocumentType,
  TamperingIndicators,
} from "./types.ts";
