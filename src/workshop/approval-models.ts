export interface CustomerApproval {
  approval_id: string;
  job_card_id: string;
  estimate_id: string;
  
  channel: string; // SMS, WHATSAPP, EMAIL, IN_PERSON
  method: string; // OTP, DIGITAL_SIGNATURE, VOICE
  
  voice_approval_reference?: string;
  digital_signature_url?: string;
  otp_verified: boolean;
  
  status: string; // REQUESTED, APPROVED, REJECTED
  approval_time?: string;
  
  history: {
    action: string;
    timestamp: string;
  }[];
}
