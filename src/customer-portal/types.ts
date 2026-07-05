// ==========================================
// Customer Portal — Type Definitions
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
