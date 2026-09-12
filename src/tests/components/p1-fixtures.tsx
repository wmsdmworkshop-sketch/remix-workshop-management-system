import React from "react";
import { vi } from "vitest";

/**
 * Synthetic fixtures for P1 component acceptance tests.
 * No production data. Nothing here touches a database or a server.
 */

export const jobWaiting: any = {
  job_id: 9001,
  job_card_no: "JC-TEST-9001",
  vrn: "KA32AB9690",
  customer_name: "Devanand Logistics",
  customer_mobile: "9845000000",
  status: "Waiting",
  vehicle_make: "TATA",
  vehicle_model: "Tata 1109g",
  sr_type_id: 1,
  date_in: "2026-09-12",
  time_in: "09:00",
  job_description: "Clutch slipping",
  service_advisor: "RANJEET",
  technician_name: "",
  km_reading: 173559,
  created_at: "2026-09-12T09:00:00.000Z",
};

/** Same-day job: waiting days must be a genuine 0, not a failure value. */
export const jobSameDay: any = {
  ...jobWaiting,
  job_id: 9002,
  job_card_no: "JC-TEST-9002",
  vrn: "KA32AB0307",
  date_in: "2026-09-12",
  date_completed: "2026-09-12",
  status: "Completed",
};

/** No date_in and no created_at: waiting days cannot be computed. */
export const jobNoDates: any = {
  job_id: 9003,
  job_card_no: "JC-TEST-9003",
  vrn: "KA32AA5577",
  customer_name: "Test Customer",
  customer_mobile: "9800000000",
  status: "Waiting",
  vehicle_make: "TATA",
  vehicle_model: "Tata 1109g",
  sr_type_id: 1,
  date_in: "",
  created_at: "",
  job_description: "No dates recorded",
  service_advisor: "RANJEET",
};

export const baseProps = (over: Record<string, any> = {}) => ({
  jobCards: [jobWaiting],
  bays: [{ bay_id: 1, bay_name: "B-01", status: "Idle" }] as any,
  srTypes: [{ sr_type_id: 1, sr_type_name: "Running Repair" }] as any,
  employees: [
    { employee_id: 16, full_name: "MD GOUSE", role: "Technician", is_active: true, basic_salary: 20000 },
  ] as any,
  allocations: [] as any,
  revenues: [] as any,
  splitDetails: [] as any,
  onCreateJob: vi.fn(),
  onUpdateJob: vi.fn(),
  onUpdateJobStatus: vi.fn(),
  onAssignTechnicians: vi.fn(async () => true),
  onCalculateRevenue: vi.fn(async () => true),
  onRaiseCarryForward: vi.fn(),
  onRaiseRework: vi.fn(),
  selectedJobExternal: null,
  currentUserRole: "workshop_manager",
  currentUser: { user_id: 1, full_name: "Test Manager", role: "workshop_manager" } as any,
  ...over,
});

/** Stub fetch for a specific URL fragment; everything else still throws. */
export function stubFetch(routes: Array<{ match: string; ok?: boolean; status?: number; json?: any; reject?: boolean }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any) => {
      const url = String(input);
      const r = routes.find((x) => url.includes(x.match));
      if (!r) throw new Error(`Unmocked fetch: ${url}`);
      if (r.reject) throw new Error("Network down");
      return {
        ok: r.ok !== false,
        status: r.status ?? (r.ok === false ? 500 : 200),
        statusText: r.ok === false ? "Server Error" : "OK",
        json: async () => r.json ?? {},
      } as any;
    })
  );
}
