import { CustomerApproval } from "./approval-models";

export class ApprovalEngine {
  static requestApproval(jobCardId: string, estimateId: string, channel: string, method: string): CustomerApproval {
    return {
      approval_id: `APP-${Math.floor(Math.random() * 10000)}`,
      job_card_id: jobCardId,
      estimate_id: estimateId,
      channel,
      method,
      otp_verified: false,
      status: "REQUESTED",
      history: [{ action: "REQUESTED", timestamp: new Date().toISOString() }]
    };
  }

  static grantApproval(approval: CustomerApproval): CustomerApproval {
    return {
      ...approval,
      status: "APPROVED",
      approval_time: new Date().toISOString(),
      history: [...approval.history, { action: "APPROVED", timestamp: new Date().toISOString() }]
    };
  }
}
