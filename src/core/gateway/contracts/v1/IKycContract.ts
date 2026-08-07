/**
 * DWIP Enterprise Integration Gateway - v1 Contracts
 * IKycContract: KYC Verification API Contract Interface v1
 */

export interface DwipKycRecordV1 {
  kycId: string;
  customerCode: string;
  documentType: string; // PAN, AADHAAR, GSTIN, DRIVING_LICENSE
  documentNumber: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  verifiedAt?: string;
}

export interface IKycContractV1 {
  readonly contractVersion: 'v1';

  verifyKycDocument(documentType: string, documentNumber: string): Promise<DwipKycRecordV1>;
  getKycStatus(kycId: string): Promise<DwipKycRecordV1 | null>;
}
