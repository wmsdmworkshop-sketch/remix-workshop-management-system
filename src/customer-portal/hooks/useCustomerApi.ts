// ==========================================
// Customer Portal — Frontend API Hooks
// ==========================================
// Provides fetch helpers for the customer portal frontend.

const API_BASE = "/api/customer";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("customer_token");
  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function requestOtp(mobile: string): Promise<{ success: boolean; message: string; error?: string }> {
  const res = await fetch(`${API_BASE}/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile }),
  });
  return res.json();
}

export async function verifyOtp(mobile: string, otp: string): Promise<{
  success: boolean;
  token?: string;
  customer?: { mobile: string; name: string };
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, otp }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("customer_token", data.token);
    localStorage.setItem("customer_name", data.customer?.name || "");
    localStorage.setItem("customer_mobile", data.customer?.mobile || "");
  }
  return data;
}

export async function signupCustomer(name: string, mobile: string, authProvider = "mobile"): Promise<{
  success: boolean;
  token?: string;
  customer?: { mobile: string; name: string };
  customerPassportId?: string;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mobile, authProvider }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("customer_token", data.token);
    localStorage.setItem("customer_name", data.customer?.name || "");
    localStorage.setItem("customer_mobile", data.customer?.mobile || "");
  }

  // Create Customer Passport via DWIP pilot registration (non-blocking)
  if (data.success) {
    try {
      const regRes = await fetch("/api/v1/pilot/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name,
          mobile,
          email: "",
          address: "",
          vehicleRc: "PENDING",
          insurance: "",
          aadharCode: "",
          gstCode: "",
        }),
      });
      const regData = await regRes.json();
      if (regData.success && regData.customerPassportId) {
        localStorage.setItem("customer_passport_id", regData.customerPassportId);
        data.customerPassportId = regData.customerPassportId;
      }
    } catch {
      // Non-blocking — passport creation failure does not break signup
      console.warn("[CustomerPortal] Passport registration deferred — will retry on next login");
    }
  }

  return data;
}

export async function fetchVehicles() {
  const res = await fetch(`${API_BASE}/vehicles`, { headers: getAuthHeaders() });
  if (res.status === 401) { logout(); throw new Error("Session expired"); }
  return res.json();
}

export async function fetchJobs() {
  const res = await fetch(`${API_BASE}/jobs`, { headers: getAuthHeaders() });
  if (res.status === 401) { logout(); throw new Error("Session expired"); }
  return res.json();
}

export async function fetchJobDetail(jobCardNo: string) {
  const res = await fetch(`${API_BASE}/jobs/${jobCardNo}`, { headers: getAuthHeaders() });
  if (res.status === 401) { logout(); throw new Error("Session expired"); }
  return res.json();
}

export async function sendChatMessage(message: string): Promise<{
  response: string;
  timestamp: string;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });

  if (res.status === 429) {
    return {
      response: "You've sent too many messages. Please wait a minute.",
      timestamp: new Date().toISOString(),
      error: "rate_limited",
    };
  }
  if (res.status === 401) { logout(); throw new Error("Session expired"); }
  return res.json();
}

export function logout() {
  localStorage.removeItem("customer_token");
  localStorage.removeItem("customer_name");
  localStorage.removeItem("customer_mobile");
  localStorage.removeItem("customer_passport_id");
  window.location.reload();
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem("customer_token");
}

export function getCustomerInfo(): { name: string; mobile: string; passportId: string } {
  return {
    name: localStorage.getItem("customer_name") || "",
    mobile: localStorage.getItem("customer_mobile") || "",
    passportId: localStorage.getItem("customer_passport_id") || "",
  };
}

export async function fetchCustomerStatus(): Promise<{
  success: boolean;
  customer?: {
    customerPassportId: string;
    name: string;
    mobile: string;
    email: string;
    verificationStatus: string;
    documentPassportCount: number;
    documentPassports: Array<{
      passportId: string;
      documentType: string;
      status: string;
      verificationScore: number;
    }>;
  };
  error?: string;
}> {
  const mobile = localStorage.getItem("customer_mobile");
  if (!mobile) return { success: false, error: "Not logged in" };

  try {
    const res = await fetch(`/api/v1/pilot/customer/status?mobile=${encodeURIComponent(mobile)}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}

// ============================================================
// V2 NEW API HOOKS
// ============================================================

/** Discover vehicles associated with the customer's mobile number. */
export async function discoverVehicles(): Promise<{
  success: boolean;
  vehicles?: Array<{
    vrn: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year: number;
    last_service_date: string | null;
    total_visits: number;
    chassis_last6_hint: string;
  }>;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/discover-vehicles`, { headers: getAuthHeaders() });
  if (res.status === 401) { logout(); throw new Error("Session expired"); }
  return res.json();
}

/** Verify vehicle ownership with one of 5 methods. */
export async function verifyVehicleOwnership(
  vrn: string,
  method: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/verify-vehicle`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ vrn, method, value }),
  });
  if (res.status === 401) { logout(); throw new Error("Session expired"); }
  return res.json();
}

/** Fetch complete vehicle service passport. */
export async function fetchVehiclePassport(vrn: string): Promise<{
  success: boolean;
  passport?: any;
  error?: string;
}> {
  const encoded = encodeURIComponent(vrn);
  const res = await fetch(`${API_BASE}/vehicles/${encoded}/passport`, { headers: getAuthHeaders() });
  if (res.status === 401) { logout(); throw new Error("Session expired"); }
  return res.json();
}

/** Fetch warranty status and claims for a vehicle. */
export async function fetchWarrantyStatus(vrn: string): Promise<{
  success: boolean;
  warranty?: any;
  error?: string;
}> {
  const encoded = encodeURIComponent(vrn);
  const res = await fetch(`${API_BASE}/vehicles/${encoded}/warranty`, { headers: getAuthHeaders() });
  if (res.status === 401) { logout(); throw new Error("Session expired"); }
  return res.json();
}

/** Fetch notification history. */
export async function fetchNotifications(): Promise<{
  success: boolean;
  notifications?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/notifications`, { headers: getAuthHeaders() });
    if (res.status === 401) { logout(); throw new Error("Session expired"); }
    return res.json();
  } catch {
    return { success: false, notifications: [], error: "Network error" };
  }
}

/** Mark all notifications as read. */
export async function markNotificationsRead(): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch { /* silent fail */ }
}

/** Fetch notification preferences. */
export async function fetchNotificationPrefs(): Promise<{
  success: boolean;
  prefs?: Record<string, boolean>;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/notification-prefs`, { headers: getAuthHeaders() });
    if (res.status === 401) { logout(); throw new Error("Session expired"); }
    return res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}

/** Update notification preferences. */
export async function updateNotificationPrefs(prefs: Record<string, boolean>): Promise<void> {
  try {
    await fetch(`${API_BASE}/notification-prefs`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(prefs),
    });
  } catch { /* silent fail */ }
}

/** Request an advisor callback. */
export async function requestCallback(
  name: string,
  mobile: string,
  preferredTime?: string,
  note?: string
): Promise<{ success: boolean; ticketNo?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/support/callback`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, mobile, preferredTime, note }),
  });
  return res.json();
}

/** Raise a customer complaint. */
export async function raiseComplaint(
  subject: string,
  detail: string,
  severity: string
): Promise<{ success: boolean; ticketNo?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/support/complaint`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ subject, detail, severity }),
  });
  return res.json();
}

/** Global search across vehicles, jobs, and documents. */
export async function globalSearch(
  query: string,
  filter: string = "all"
): Promise<{ success: boolean; results?: any[]; error?: string }> {
  try {
    const params = new URLSearchParams({ q: query, filter });
    const res = await fetch(`${API_BASE}/search?${params}`, { headers: getAuthHeaders() });
    if (res.status === 401) { logout(); throw new Error("Session expired"); }
    return res.json();
  } catch {
    return { success: false, results: [], error: "Search failed" };
  }
}

/** Fetch expanded customer profile. */
export async function fetchCustomerProfile(): Promise<{
  success: boolean;
  profile?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/profile`, { headers: getAuthHeaders() });
    if (res.status === 401) { logout(); throw new Error("Session expired"); }
    return res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}

/** Update expanded customer profile. */
export async function updateCustomerProfile(profile: Partial<{
  name: string;
  email: string;
  company_name: string;
  gst_number: string;
  emergency_contact_name: string;
  emergency_contact_mobile: string;
  preferred_workshop: string;
}>): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(profile),
    });
    return res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}

// ============================================================
// V3 UAT API HOOKS — Real write-back, no mocks
// ============================================================

/** Approve estimate — writes to ERP + broadcasts to ERP in real-time. */
export async function approveEstimate(jobCardNo: string): Promise<{
  success: boolean;
  approvedAt?: string;
  alreadyApproved?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobCardNo)}/approve-estimate`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (res.status === 401) { logout(); throw new Error("Session expired"); }
    return res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

/** Record online payment — writes to ERP finance module + generates receipt. */
export async function payInvoice(opts: {
  jobCardNo: string;
  method: "upi" | "card" | "netbanking" | "counter";
  transactionRef?: string;
  amount?: number;
}): Promise<{
  success: boolean;
  receiptNo?: string;
  transactionRef?: string;
  paidAt?: string;
  paidAmount?: number;
  alreadyPaid?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(opts.jobCardNo)}/pay`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        method: opts.method,
        transactionRef: opts.transactionRef || "",
        amount: opts.amount,
      }),
    });
    if (res.status === 401) { logout(); throw new Error("Session expired"); }
    return res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

/** Dispatch SOS breakdown request — creates job card + assigns QRT. */
export async function dispatchSOS(opts: {
  vrn: string;
  location_text: string;
  lat?: number | null;
  lng?: number | null;
  issue_type: string;
}): Promise<{
  success: boolean;
  ticketNo?: string;
  qrtName?: string;
  etaMinutes?: number;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/sos`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(opts),
    });
    if (res.status === 401) { logout(); throw new Error("Session expired"); }
    return res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

/** Google OAuth login — verifies Google ID token, issues DWIP JWT. */
export async function googleLogin(credential: string, linkMobile?: string): Promise<{
  success: boolean;
  needsMobileLink?: boolean;
  token?: string;
  customer?: { mobile: string; name: string; email: string; authProvider: string };
  googleName?: string;
  googleEmail?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, linkMobile }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("customer_token", data.token);
      localStorage.setItem("customer_name", data.customer?.name || "");
      localStorage.setItem("customer_mobile", data.customer?.mobile || "");
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || "Google login failed" };
  }
}
