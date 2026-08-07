import { pool as db } from "../../db/index.ts";
import crypto from "crypto";
import type {
  PassportCertificate,
  CertificateType,
  CertificateStatus,
  VehiclePassport,
  VehicleHealthReport,
  VerificationLevel,
} from "./types.ts";
import { SimpleSigningProvider } from "./signing-provider.ts";

export class CertificateService {
  private signer = new SimpleSigningProvider();

  /**
   * Generates a digitally signed view certificate mapped to a Vehicle Passport.
   */
  async generateCertificate(params: {
    passport: VehiclePassport;
    certificateType: CertificateType;
    healthReport: VehicleHealthReport;
    eventsSummary: {
      totalEvents: number;
      verificationDistribution: Record<VerificationLevel, number>;
    };
    generatedBy: string;
    tier: "FREE" | "PREMIUM";
    viewSpecificData?: Record<string, any>;
  }): Promise<PassportCertificate> {
    const certificateId = `CERT-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const year = new Date().getFullYear();
    const uniqueSerial = crypto.randomBytes(4).toString("hex").toUpperCase();
    const qrCode = `DWIP-RP-${year}-${uniqueSerial}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '); // Valid for 90 days

    // Snapshot payload to digitally sign
    const signPayload = {
      certificateId,
      passportId: params.passport.passportId,
      vin: params.passport.vin,
      certificateType: params.certificateType,
      passportScoreAtGeneration: params.passport.passportScore,
      generatedAt: now,
    };

    const { signature, hash } = await this.signer.sign(signPayload);

    const certificate: PassportCertificate = {
      certificateId,
      passportId: params.passport.passportId,
      certificateType: params.certificateType,
      certificateStatus: "VALID",
      qrCode,
      digitalSignature: signature,
      certificateHash: hash,
      healthSnapshot: params.healthReport,
      trustSnapshot: {
        trustScore: params.passport.trustScore,
        totalEvents: params.eventsSummary.totalEvents,
        verificationDistribution: params.eventsSummary.verificationDistribution,
      },
      passportScoreAtGeneration: params.passport.passportScore,
      generatedBy: params.generatedBy,
      tier: params.tier,
      generatedAt: now,
      expiresAt,
      viewSpecificData: params.viewSpecificData || {},
    };

    await db.execute(
      `INSERT INTO vehicle_certificates (
        certificate_id, passport_id, certificate_type, certificate_status, qr_code,
        digital_signature, certificate_hash, health_snapshot, trust_snapshot,
        passport_score_at_generation, generated_by, tier, generated_at, expires_at, view_specific_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        certificate.certificateId, certificate.passportId, certificate.certificateType,
        certificate.certificateStatus, certificate.qrCode, certificate.digitalSignature,
        certificate.certificateHash, JSON.stringify(certificate.healthSnapshot),
        JSON.stringify(certificate.trustSnapshot), certificate.passportScoreAtGeneration,
        certificate.generatedBy, certificate.tier, certificate.generatedAt,
        certificate.expiresAt, JSON.stringify(certificate.viewSpecificData)
      ]
    );

    return certificate;
  }

  /**
   * Fetches a certificate by its unique generated Certificate ID.
   */
  async getCertificate(certificateId: string): Promise<PassportCertificate | null> {
    const [rows] = await db.query(
      "SELECT * FROM vehicle_certificates WHERE certificate_id = ?",
      [certificateId]
    ) as any[];

    if (!rows || rows.length === 0) return null;
    return this.mapRowToCertificate(rows[0]);
  }

  /**
   * Fetches a certificate by QR verification lookup.
   */
  async verifyQr(qrCode: string): Promise<PassportCertificate | null> {
    const [rows] = await db.query(
      "SELECT * FROM vehicle_certificates WHERE qr_code = ?",
      [qrCode]
    ) as any[];

    if (!rows || rows.length === 0) return null;
    return this.mapRowToCertificate(rows[0]);
  }

  private mapRowToCertificate(row: any): PassportCertificate {
    let healthSnapshot: any = {};
    let trustSnapshot: any = {};
    let viewSpecificData: any = {};
    try {
      healthSnapshot = typeof row.health_snapshot === "string" ? JSON.parse(row.health_snapshot) : row.health_snapshot;
      trustSnapshot = typeof row.trust_snapshot === "string" ? JSON.parse(row.trust_snapshot) : row.trust_snapshot;
      viewSpecificData = typeof row.view_specific_data === "string" ? JSON.parse(row.view_specific_data) : row.view_specific_data;
    } catch {}

    return {
      certificateId: row.certificate_id,
      passportId: row.passport_id,
      certificateType: row.certificate_type as CertificateType,
      certificateStatus: row.certificate_status as CertificateStatus,
      qrCode: row.qr_code,
      digitalSignature: row.digital_signature,
      certificateHash: row.certificate_hash,
      healthSnapshot,
      trustSnapshot,
      passportScoreAtGeneration: Number(row.passport_score_at_generation),
      generatedBy: row.generated_by,
      tier: row.tier as "FREE" | "PREMIUM",
      generatedAt: row.generated_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at || undefined,
      viewSpecificData,
    };
  }
}
