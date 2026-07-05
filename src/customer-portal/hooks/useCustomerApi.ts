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
  window.location.reload();
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem("customer_token");
}

export function getCustomerInfo(): { name: string; mobile: string } {
  return {
    name: localStorage.getItem("customer_name") || "",
    mobile: localStorage.getItem("customer_mobile") || "",
  };
}
