/**
 * =============================================================================
 * DWIP Enterprise Platform — OCR Evidence Storage & Retention Pipeline
 * Bounded Context: Workshop Operations / Evidence & Audit Trail
 * Description: Unified storage service for all OCR processed images (Gate-in
 *              ANPR, Invoices, Manual Job Cards, Parts Photos, Fuel Gauges, Odometer).
 *              Stores binary blobs in Google Cloud Storage (with local disk fallback),
 *              persists immutable metadata in MySQL `ocr_evidence`, and manages
 *              a 90-day retention window while preserving audit records permanently.
 * =============================================================================
 */

import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { pool as db } from "../db/index.ts";

export type OcrEvidenceType =
  | "NUMBERPLATE"
  | "INVOICE"
  | "MANUAL_JOBCARD"
  | "PARTS_PHOTO"
  | "FUEL_GAUGE"
  | "ODOMETER";

export interface StoreEvidenceParams {
  base64Image: string;
  ocrType: OcrEvidenceType;
  jobCardNo?: string | null;
  gateEntryId?: string | null;
  vrn?: string | null;
  ocrProvider?: string | null;
  ocrResultJson?: any;
  ocrConfidence?: number | null;
  capturedBy?: number | null;
  branchId?: string | null;
  mimeType?: string | null;
}

export interface EvidenceRecord {
  evidence_id: string;
  ocr_type: OcrEvidenceType;
  job_card_no: string | null;
  gate_entry_id: string | null;
  vrn: string | null;
  photo_url: string | null;
  photo_size_bytes: number | null;
  captured_at: string;
  captured_by: number | null;
  ocr_provider: string | null;
  ocr_result_json: string | null;
  ocr_confidence: number | null;
  retention_expiry: string;
  is_deleted: boolean;
  branch_id: string;
  created_at: string;
}

export class EvidenceStorageService {
  private static instance: EvidenceStorageService;
  private gcsStorage: Storage | null = null;
  private bucketName: string;
  private gcsInitialized = false;

  private constructor() {
    this.bucketName =
      process.env.GCS_EVIDENCE_BUCKET ||
      process.env.GCS_BUCKET_NAME ||
      "dwip-ocr-evidence";
    this.initGcs();
  }

  public static getInstance(): EvidenceStorageService {
    if (!EvidenceStorageService.instance) {
      EvidenceStorageService.instance = new EvidenceStorageService();
    }
    return EvidenceStorageService.instance;
  }

  private initGcs(): void {
    try {
      this.gcsStorage = new Storage();
      this.gcsInitialized = true;
    } catch (err: any) {
      console.warn(
        `[EvidenceStorage] GCS initialization in local/fallback mode: ${err.message}`
      );
      this.gcsStorage = null;
      this.gcsInitialized = false;
    }
  }

  /**
   * Parse base64 string to buffer and mime type
   */
  private parseBase64(data: string, defaultMime = "image/jpeg"): { buffer: Buffer; mime: string; ext: string } {
    let cleanBase64 = data;
    let mime = defaultMime;

    if (data.startsWith("data:")) {
      const match = data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mime = match[1];
        cleanBase64 = match[2];
      }
    }

    const buffer = Buffer.from(cleanBase64, "base64");
    let ext = "jpg";
    if (mime.includes("png")) ext = "png";
    else if (mime.includes("webp")) ext = "webp";
    else if (mime.includes("pdf")) ext = "pdf";

    return { buffer, mime, ext };
  }

  /**
   * Upload binary data to Google Cloud Storage or local fallback directory
   */
  private async uploadImage(
    buffer: Buffer,
    filePath: string,
    mimeType: string
  ): Promise<string> {
    // 1. Try GCS if available
    if (this.gcsStorage && this.bucketName) {
      try {
        const bucket = this.gcsStorage.bucket(this.bucketName);
        const file = bucket.file(filePath);
        await file.save(buffer, {
          metadata: {
            contentType: mimeType,
            cacheControl: "public, max-age=31536000",
          },
          resumable: false,
        });

        return `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
      } catch (err: any) {
        console.warn(
          `[EvidenceStorage] GCS upload to bucket '${this.bucketName}' failed: ${err.message}. Falling back to local storage.`
        );
      }
    }

    // 2. Local disk fallback (persists in public uploads folder for local dev & offline resilience)
    try {
      const publicDir = path.resolve(process.cwd(), "public", "uploads", "ocr-evidence");
      const targetDir = path.join(publicDir, path.dirname(filePath));
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const localFilePath = path.join(publicDir, filePath);
      fs.writeFileSync(localFilePath, buffer);

      return `/uploads/ocr-evidence/${filePath}`;
    } catch (localErr: any) {
      console.error(
        `[EvidenceStorage] Local disk write fallback failed: ${localErr.message}`
      );
      // As last resort, return data URL placeholder so audit record isn't lost
      return `data:${mimeType};base64,${buffer.toString("base64").substring(0, 100)}...`;
    }
  }

  /**
   * Stores an OCR processed image and writes immutable audit record to MySQL `ocr_evidence`.
   */
  public async storeEvidence(params: StoreEvidenceParams): Promise<EvidenceRecord | null> {
    if (!params.base64Image) {
      console.warn("[EvidenceStorage] storeEvidence called with empty image.");
      return null;
    }

    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const evidenceId = `EVD-${Date.now().toString(36).toUpperCase()}-${randomUUID().substring(0, 4).toUpperCase()}`;

      // 90-day retention window calculation
      const retentionExpiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const retentionExpiryStr = retentionExpiryDate.toISOString().split("T")[0];

      const { buffer, mime, ext } = this.parseBase64(params.base64Image, params.mimeType || "image/jpeg");
      const relativePath = `${params.ocrType.toLowerCase()}/${dateStr}/${evidenceId}.${ext}`;

      // 1. Upload to GCS / Local Storage
      const photoUrl = await this.uploadImage(buffer, relativePath, mime);
      const photoSizeBytes = buffer.length;

      // 2. Format fields for MySQL insertion
      const rawResultJson = params.ocrResultJson
        ? typeof params.ocrResultJson === "string"
          ? params.ocrResultJson
          : JSON.stringify(params.ocrResultJson)
        : null;

      const vrnClean = params.vrn
        ? params.vrn.toUpperCase().replace(/[^A-Z0-9]/g, "")
        : null;

      const branchId = params.branchId || "BR-SEDAM";

      // 3. Persist metadata to MySQL
      await db.execute(
        `INSERT INTO \`ocr_evidence\` (
          \`evidence_id\`, \`ocr_type\`, \`job_card_no\`, \`gate_entry_id\`, \`vrn\`,
          \`photo_url\`, \`photo_size_bytes\`, \`captured_at\`, \`captured_by\`,
          \`ocr_provider\`, \`ocr_result_json\`, \`ocr_confidence\`, \`retention_expiry\`,
          \`is_deleted\`, \`branch_id\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          evidenceId,
          params.ocrType,
          params.jobCardNo || null,
          params.gateEntryId || null,
          vrnClean,
          photoUrl,
          photoSizeBytes,
          now,
          params.capturedBy || null,
          params.ocrProvider || "Azure",
          rawResultJson,
          params.ocrConfidence || null,
          retentionExpiryStr,
          branchId,
        ]
      );

      console.log(
        `[EvidenceStorage] Stored evidence ${evidenceId} for type ${params.ocrType} (VRN: ${vrnClean || "N/A"}, Size: ${(photoSizeBytes / 1024).toFixed(1)} KB)`
      );

      return {
        evidence_id: evidenceId,
        ocr_type: params.ocrType,
        job_card_no: params.jobCardNo || null,
        gate_entry_id: params.gateEntryId || null,
        vrn: vrnClean,
        photo_url: photoUrl,
        photo_size_bytes: photoSizeBytes,
        captured_at: now.toISOString(),
        captured_by: params.capturedBy || null,
        ocr_provider: params.ocrProvider || "Azure",
        ocr_result_json: rawResultJson,
        ocr_confidence: params.ocrConfidence || null,
        retention_expiry: retentionExpiryStr,
        is_deleted: false,
        branch_id: branchId,
        created_at: now.toISOString(),
      };
    } catch (err: any) {
      console.error("[EvidenceStorage] Failed to store OCR evidence:", err.message);
      return null;
    }
  }

  /**
   * Retrieve active evidence records for a given VRN
   */
  public async getEvidenceByVrn(vrn: string): Promise<EvidenceRecord[]> {
    try {
      const clean = vrn.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const [rows]: any = await db.query(
        "SELECT * FROM `ocr_evidence` WHERE `vrn` = ? AND `is_deleted` = 0 ORDER BY `captured_at` DESC",
        [clean]
      );
      return Array.isArray(rows) ? rows : [];
    } catch (err: any) {
      console.error("[EvidenceStorage] getEvidenceByVrn failed:", err.message);
      return [];
    }
  }

  /**
   * Retrieve active evidence records for a given Job Card Number
   */
  public async getEvidenceByJobCard(jobCardNo: string): Promise<EvidenceRecord[]> {
    try {
      const [rows]: any = await db.query(
        "SELECT * FROM `ocr_evidence` WHERE `job_card_no` = ? AND `is_deleted` = 0 ORDER BY `captured_at` DESC",
        [jobCardNo]
      );
      return Array.isArray(rows) ? rows : [];
    } catch (err: any) {
      console.error("[EvidenceStorage] getEvidenceByJobCard failed:", err.message);
      return [];
    }
  }

  /**
   * 90-Day Retention Worker: Marks expired evidence records as deleted in DB
   * Metadata is kept permanently for compliance and audit trail.
   */
  public async markExpiredAsDeleted(): Promise<{ expiredCount: number }> {
    try {
      const [result]: any = await db.execute(
        "UPDATE `ocr_evidence` SET `is_deleted` = 1 WHERE `retention_expiry` <= CURDATE() AND `is_deleted` = 0"
      );
      const expiredCount = result?.affectedRows || 0;
      console.log(`[EvidenceStorage] Retention worker: marked ${expiredCount} records as expired/deleted.`);
      return { expiredCount };
    } catch (err: any) {
      console.error("[EvidenceStorage] markExpiredAsDeleted failed:", err.message);
      return { expiredCount: 0 };
    }
  }
}

export const evidenceStorageService = EvidenceStorageService.getInstance();
