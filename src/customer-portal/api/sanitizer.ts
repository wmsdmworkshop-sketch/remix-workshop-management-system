// ==========================================
// Customer Portal — Response Sanitizer
// ==========================================
// SECURITY CRITICAL: This is the SINGLE CHOKE POINT for data exposure.
// Every customer-facing route MUST pass through sanitizeJobCard().
// Raw JobCard objects NEVER leave the server boundary.

import type { CustomerJobView, CustomerVehicleView } from "../types";

// Fields that are EXPLICITLY BLOCKED from customer view
const BLOCKED_FIELDS = new Set([
  "labor_price", "parts_price",
  "technician_name", "service_advisor",
  "no_of_laborers", "bay_id", "bay_no",
  "created_by", "created_at", "updated_at",
  "l1_delay", "l2_delay", "l3_delay", "l5_delay",
  "delay_notes", "pending_reason", "remarks",
  "workshop_stage", "tat_status", "time_slot",
  "numberplate_photo", "odometer_photo",
  "chassis_number", "driver_name", "driver_mobile", "driver_image",
  "token_number", "waiting_time_mins",
  "parts_status", "parts_list", "parts_images",
  "payment_method", "payment_reference", "gate_pass_issued",
  "sr_type_id", "job_id", "vin",
  "started_at", "invoiced_at",
  "job_status_master", "live_status_master",
  "in_job_card_technician", "in_bay_queue", "bay_queue_status",
  "actual_time_taken", "service_type_master",
  "technician_assignments", "completed_today", "billing_status",
  "exited_at",
]);

/**
 * Service type name resolver.
 * Maps sr_type_id to human-readable names.
 */
const SR_TYPE_MAP: Record<number, string> = {
  1: "General Repair",
  2: "Periodic Maintenance",
  3: "Engine Overhaul",
  4: "AC Service & Repair",
  5: "Brake Service",
  6: "Electrical Work",
  7: "Body & Paint",
  8: "Tyre & Alignment",
  9: "Quick Service",
  10: "Warranty Job",
};

/**
 * Sanitize a raw JobCard into a safe CustomerJobView.
 * This function is PURE — no side effects, no DB calls.
 */
export function sanitizeJobCard(rawJob: any, srTypes?: any[]): CustomerJobView {
  // Resolve service type name
  let serviceType = "Service";
  if (srTypes && rawJob.sr_type_id) {
    const found = srTypes.find((s: any) => s.sr_type_id === rawJob.sr_type_id);
    if (found) serviceType = found.sr_type_name;
  } else if (rawJob.sr_type_id && SR_TYPE_MAP[rawJob.sr_type_id]) {
    serviceType = SR_TYPE_MAP[rawJob.sr_type_id];
  }

  return {
    job_card_no: rawJob.job_card_no || "",
    vrn: rawJob.vrn || "",
    vehicle_model: rawJob.vehicle_model || "",
    vehicle_make: rawJob.vehicle_make || "",
    vehicle_year: rawJob.vehicle_year || 0,
    km_reading: rawJob.km_reading ?? null,
    service_type: serviceType,
    job_description: sanitizeDescription(rawJob.job_description || ""),
    status: rawJob.status || "Unknown",
    priority: rawJob.priority || "Normal",
    etd: rawJob.etd || null,
    progress_pct: rawJob.progress_pct ?? null,
    date_in: rawJob.date_in || null,
    expected_date_out: rawJob.expected_date_out || null,
    completed_at: rawJob.completed_at || null,
    invoice_no: rawJob.invoice_no || null,
    gate_out_time: rawJob.gate_out_time || null,
    warranty_status: rawJob.warranty_status || null,
  };
}

/**
 * Sanitize job description to remove any internal notes.
 * Strips anything after "---" or "INTERNAL:" markers.
 */
function sanitizeDescription(desc: string): string {
  const markers = ["---", "INTERNAL:", "NOTE:", "STAFF:", "DELAY:"];
  let clean = desc;
  for (const marker of markers) {
    const idx = clean.toUpperCase().indexOf(marker);
    if (idx !== -1) {
      clean = clean.substring(0, idx).trim();
    }
  }
  return clean || "Vehicle service in progress";
}

/**
 * Build a vehicle summary from a list of raw job cards for one VRN.
 */
export function buildVehicleView(vrn: string, jobs: any[]): CustomerVehicleView {
  const latest = jobs[0]; // jobs should be sorted by created_at DESC
  const activeJobs = jobs.filter(
    (j: any) => j.status === "Active" || j.status === "Waiting"
  ).length;

  const completedDates = jobs
    .filter((j: any) => j.completed_at)
    .map((j: any) => j.completed_at)
    .sort()
    .reverse();

  return {
    vrn,
    vehicle_model: latest?.vehicle_model || "",
    vehicle_make: latest?.vehicle_make || "",
    vehicle_year: latest?.vehicle_year || 0,
    active_jobs: activeJobs,
    last_service_date: completedDates[0] || null,
    total_visits: jobs.length,
  };
}

/**
 * Verify that a job card belongs to the authenticated customer.
 * Returns true ONLY if the job's customer_mobile matches the token's mobile.
 */
export function verifyJobOwnership(rawJob: any, customerMobile: string): boolean {
  if (!rawJob || !customerMobile) return false;
  const jobMobile = (rawJob.customer_mobile || "").replace(/\s+/g, "");
  const authMobile = customerMobile.replace(/\s+/g, "");
  // Match with or without country code prefix
  return (
    jobMobile === authMobile ||
    jobMobile.endsWith(authMobile.slice(-10)) ||
    authMobile.endsWith(jobMobile.slice(-10))
  );
}
