import { ExecutionResult, KernelErrorCode } from "../../core/kernel-contracts";
import { WarrantyClaimHeader } from "./domain-models";
import { OemStatus } from "./config/constants";
import { ExternalProgramProvider } from "../common/provider-interface";

const NOW = () => new Date().toISOString();
const CORRELATION = () => `SYS-${Date.now()}`;

function ok<T>(data?: T): ExecutionResult<T> {
  return Object.freeze({ success: true, data, timestamp: NOW(), correlation_id: CORRELATION() } as ExecutionResult<T>);
}
function fail<T>(error: string, error_code?: string): ExecutionResult<T> {
  return Object.freeze({ success: false, error, error_code: error_code as any, timestamp: NOW(), correlation_id: CORRELATION() } as ExecutionResult<T>);
}

export class MockWarrantyProvider implements ExternalProgramProvider<WarrantyClaimHeader> {
  private claims: Map<string, any> = new Map();

  async initialize(payload: WarrantyClaimHeader): Promise<ExecutionResult<any>> {
    return ok();
  }

  async validate(payload: WarrantyClaimHeader): Promise<ExecutionResult<void>> {
    return ok();
  }

  async submit(claim: WarrantyClaimHeader): Promise<ExecutionResult<{ reference: string }>> {
    const ref = `OEM-REF-${Math.floor(Math.random() * 1000000)}`;
    this.claims.set(claim.claim_number, { status: OemStatus.RECEIVED, oem_reference: ref });
    return ok({ reference: ref });
  }

  async track(reference: string): Promise<ExecutionResult<{ status: string; message: string }>> {
    const claim = this.claims.get(reference);
    if (!claim) {
      return fail("Claim not found in OEM", KernelErrorCode.NOT_FOUND);
    }
    if (claim.status === OemStatus.RECEIVED) {
      claim.status = OemStatus.UNDER_REVIEW;
    }
    return ok({ status: claim.status, message: "Processed" });
  }

  async sync(reference: string): Promise<ExecutionResult<void>> {
    return ok();
  }

  async cancel(reference: string): Promise<ExecutionResult<void>> {
    this.claims.delete(reference);
    return ok();
  }
  
  async close(reference: string): Promise<ExecutionResult<void>> {
    return ok();
  }

  // Legacy warranty-specific methods preserved to not break anything
  async uploadEvidence(claimNumber: string, evidenceId: string, fileUrl: string): Promise<ExecutionResult<void>> {
    return ok();
  }

  async requestClarification(claimNumber: string, message: string): Promise<ExecutionResult<void>> {
    return ok();
  }

  async submitClarification(claimNumber: string, message: string): Promise<ExecutionResult<void>> {
    return ok();
  }

  async downloadSettlement(claimNumber: string): Promise<ExecutionResult<{ url: string }>> {
    return ok({ url: `https://mock.oem.com/settlement/${claimNumber}.pdf` });
  }

  async downloadDebitNote(claimNumber: string): Promise<ExecutionResult<{ url: string }>> {
    return ok({ url: `https://mock.oem.com/debit/${claimNumber}.pdf` });
  }

  public simulateOemDecision(claimNumber: string, approved: boolean) {
    const claim = this.claims.get(claimNumber);
    if (claim) {
      claim.status = approved ? OemStatus.APPROVED : OemStatus.REJECTED;
    }
  }
}
