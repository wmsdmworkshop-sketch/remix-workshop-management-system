import { pool as db } from "../../db/index.ts";
import crypto from "crypto";
import type { VehicleDocument, VerificationLevel } from "./types.ts";

export class EvidenceEngine {
  /**
   * Appends verification metadata document linked to an event.
   */
  async addEvidence(params: {
    passportId: string;
    eventId?: string;
    documentType: string;
    provider: string;
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
    ocrScore: number;
    authenticityScore: number;
    tamperingScore: number;
    aiConfidence: number;
    verificationLevel: VerificationLevel;
    storageReference: string;
    documentBase64: string; // for hash calculation
    extractedFields: Record<string, string>;
  }): Promise<VehicleDocument> {
    const documentId = `DOC-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const documentHash = crypto.createHash("sha256").update(params.documentBase64).digest("hex");
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const document: VehicleDocument = {
      documentId,
      passportId: params.passportId,
      eventId: params.eventId,
      documentType: params.documentType,
      provider: params.provider,
      verificationStatus: params.verificationStatus,
      ocrScore: params.ocrScore,
      authenticityScore: params.authenticityScore,
      tamperingScore: params.tamperingScore,
      aiConfidence: params.aiConfidence,
      verificationLevel: params.verificationLevel,
      storageReference: params.storageReference,
      documentHash,
      extractedFields: params.extractedFields,
      createdAt: now,
    };

    await db.execute(
      `INSERT INTO vehicle_documents (
        document_id, passport_id, event_id, document_type, provider, verification_status,
        ocr_score, authenticity_score, tampering_score, ai_confidence,
        verification_level, storage_reference, document_hash, extracted_fields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.documentId, document.passportId, document.eventId || null,
        document.documentType, document.provider, document.verificationStatus,
        document.ocrScore, document.authenticityScore, document.tamperingScore,
        document.aiConfidence, document.verificationLevel, document.storageReference,
        document.documentHash, JSON.stringify(document.extractedFields)
      ]
    );

    return document;
  }

  /**
   * Fetches evidence documents by event link or passportId.
   */
  async getDocumentsForPassport(passportId: string): Promise<VehicleDocument[]> {
    const [rows] = await db.query(
      "SELECT * FROM vehicle_documents WHERE passport_id = ?",
      [passportId]
    ) as any[];

    if (!rows) return [];
    return rows.map((row: any) => this.mapRowToDocument(row));
  }

  private mapRowToDocument(row: any): VehicleDocument {
    let extracted: Record<string, string> = {};
    if (row.extracted_fields) {
      try {
        extracted = typeof row.extracted_fields === "string" ? JSON.parse(row.extracted_fields) : row.extracted_fields;
      } catch {
        extracted = {};
      }
    }
    return {
      documentId: row.document_id,
      passportId: row.passport_id,
      eventId: row.event_id || undefined,
      documentType: row.document_type,
      provider: row.provider,
      verificationStatus: row.verification_status,
      ocrScore: Number(row.ocr_score),
      authenticityScore: Number(row.authenticity_score),
      tamperingScore: Number(row.tampering_score),
      aiConfidence: Number(row.ai_confidence),
      verificationLevel: row.verification_level as VerificationLevel,
      storageReference: row.storage_reference,
      documentHash: row.document_hash,
      extractedFields: extracted,
      createdAt: row.created_at,
    };
  }
}
