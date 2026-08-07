// ==========================================
// Customer Portal — Type Definitions (V2)
// ==========================================
// These types define the RESTRICTED data views exposed to customers.
// NO internal metadata, staff names, or profit margins are included.

/**
 * JWT payload for customer tokens.
 * Scoped by mobile number — every query downstream is filtered by this.
 */
export interface CustomerTokenPayload {
  mobile: string;      // "+919876543201"
  name: string;        // "Vikram Sen" (display only, from first job card)
  iat?: number;
  exp?: number;
}

/**
 * Sanitized job card view — the ONLY shape a customer can ever see.
 * Internal fields (labor_price, technician_name, delays, etc.) are stripped.
 */
export interface CustomerJobView {
  job_card_no: string;
  vrn: string;
  vehicle_model: string;
  vehicle_make: string;
  vehicle_year: number;
  km_reading: number | null;
  service_type: string;            // Resolved sr_type_name (e.g., "General Repair")
  job_description: string;
  status: string;                  // "Waiting" | "Active" | "Completed" | "Invoiced"
  priority: string;                // "Normal" | "Express"
  etd: string | null;
  progress_pct: number | null;
  date_in: string | null;
  expected_date_out: string | null;
  completed_at: string | null;
  invoice_no: string | null;
  gate_out_time: string | null;
  warranty_status: string | null;
}

/**
 * Vehicle summary card — grouped by VRN.
 */
export interface CustomerVehicleView {
  vrn: string;
  vehicle_model: string;
  vehicle_make: string;
  vehicle_year: number;
  active_jobs: number;
  last_service_date: string | null;
  total_visits: number;
}

/**
 * AI chat message structure.
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/**
 * AI function call result from Gemini.
 */
export interface AgentFunctionCall {
  action: string;
  args: Record<string, string>;
}

/**
 * Rate limit info returned in response headers.
 */
export interface RateLimitInfo {
  remaining: number;
  resetAt: number;     // Unix timestamp
  limit: number;
}

// ============================================================
// V2 NEW TYPES
// ============================================================

/** Discovered vehicle — shown on first login before ownership verification. */
export interface DiscoveredVehicle {
  vrn: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  last_service_date: string | null;
  total_visits: number;
  chassis_last6_hint: string;
}

/** Vehicle passport — complete digital service history for a single vehicle. */
export interface VehiclePassportData {
  vrn: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  total_visits: number;
  total_spend: number;
  max_km: number | null;
  warranty_valid_till: string | null;
  amc_plan: string | null;
  amc_valid_till: string | null;
  history: VehiclePassportEntry[];
}

export interface VehiclePassportEntry {
  job_card_no: string;
  date_in: string;
  service_type: string;
  job_description: string;
  status: string;
  km_reading: number | null;
  invoice_no: string | null;
  invoice_amount: number | null;
  warranty_status: string | null;
  completed_at: string | null;
}

/** Warranty status and claims. */
export interface WarrantyData {
  vrn: string;
  vehicle_make: string;
  vehicle_model: string;
  warranty_type: "OEM" | "Extended" | "AMC" | "None";
  warranty_start: string | null;
  warranty_end: string | null;
  km_limit: number | null;
  km_covered: number | null;
  days_remaining: number | null;
  km_remaining: number | null;
  coverage_summary: string;
  claims: WarrantyClaim[];
}

export interface WarrantyClaim {
  claim_id: string;
  job_card_no: string;
  date: string;
  description: string;
  status: "Approved" | "Rejected" | "Pending" | "In Review";
  amount_covered: number | null;
}

/** Notification item. */
export interface NotificationItem {
  id: string;
  type: "estimate_ready" | "vehicle_ready" | "invoice_generated" | "payment_received" | "amc_due" | "warranty_expiry" | "service_reminder" | "offer" | "system";
  title: string;
  body: string;
  vrn?: string;
  job_card_no?: string;
  created_at: string;
  read: boolean;
}

/** Notification preferences. */
export interface NotificationPrefs {
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  estimate_alerts: boolean;
  vehicle_ready_alerts: boolean;
  payment_alerts: boolean;
  amc_renewal_alerts: boolean;
  service_reminder_alerts: boolean;
  offer_alerts: boolean;
}

/** Support ticket response. */
export interface SupportTicketResponse {
  success: boolean;
  ticketNo?: string;
  error?: string;
}

/** Global search result. */
export interface SearchResult {
  type: "vehicle" | "active_job" | "past_job" | "document";
  id: string;
  title: string;
  subtitle: string;
  vrn?: string;
  meta?: string;
}

/** Ownership verification method. */
export type OwnershipVerificationMethod =
  | "otp"
  | "chassis_last6"
  | "invoice_no"
  | "job_card_no"
  | "manual_admin";

/** Expanded customer profile (V2). */
export interface CustomerProfile {
  name: string;
  mobile: string;
  email: string;
  company_name: string;
  gst_number: string;
  emergency_contact_name: string;
  emergency_contact_mobile: string;
  preferred_workshop: string;
  auth_provider: string;
}
