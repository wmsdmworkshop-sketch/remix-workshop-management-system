import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvidenceStorageService, StoreEvidenceParams } from "../services/evidence-storage.service.ts";

describe("EvidenceStorageService Unit Suite", () => {
  let service: EvidenceStorageService;

  beforeEach(() => {
    service = EvidenceStorageService.getInstance();
  });

  it("should parse base64 and create evidence record with 90-day retention", async () => {
    const sampleBase64 = "data:image/jpeg;base64," + Buffer.from("test-ocr-image-bytes").toString("base64");
    const params: StoreEvidenceParams = {
      base64Image: sampleBase64,
      ocrType: "NUMBERPLATE",
      vrn: "KA32AB1234",
      jobCardNo: "JC-1001",
      ocrProvider: "Azure",
      ocrResultJson: { extractedFields: { vrn: "KA32AB1234" } },
      ocrConfidence: 0.98,
      capturedBy: 1,
      branchId: "BR-SEDAM"
    };

    const record = await service.storeEvidence(params);
    expect(record).not.toBeNull();
    if (record) {
      expect(record.evidence_id).toMatch(/^EVD-/);
      expect(record.ocr_type).toBe("NUMBERPLATE");
      expect(record.vrn).toBe("KA32AB1234");
      expect(record.job_card_no).toBe("JC-1001");
      expect(record.photo_size_bytes).toBeGreaterThan(0);
      expect(record.is_deleted).toBe(false);

      // Verify retention date is ~90 days in future
      const now = new Date();
      const expiry = new Date(record.retention_expiry);
      const diffDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(89);
      expect(diffDays).toBeLessThanOrEqual(91);
    }
  });

  it("should query evidence by VRN", async () => {
    const records = await service.getEvidenceByVrn("KA32AB1234");
    expect(Array.isArray(records)).toBe(true);
    if (records.length > 0) {
      expect(records[0].vrn).toBe("KA32AB1234");
    }
  });

  it("should query evidence by Job Card Number", async () => {
    const records = await service.getEvidenceByJobCard("JC-1001");
    expect(Array.isArray(records)).toBe(true);
  });

  it("should execute retention worker without errors", async () => {
    const res = await service.markExpiredAsDeleted();
    expect(res).toBeDefined();
    expect(typeof res.expiredCount).toBe("number");
  });
});
