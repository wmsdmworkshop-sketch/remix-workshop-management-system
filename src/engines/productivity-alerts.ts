import { TechnicianKPIDaily, ProductivityAlert } from "../types";

export function checkAndGenerateAlerts(
  kpi: Omit<TechnicianKPIDaily, 'id'>,
  dbCache: any
): Omit<ProductivityAlert, 'id'>[] {
  const alerts: Omit<ProductivityAlert, 'id'>[] = [];
  const employeeId = kpi.employee_id;

  // ALERT 1: Low Technician Efficiency (< 70%)
  if (kpi.completion_efficiency < 70) {
    alerts.push({
      employee_id: employeeId,
      alert_type: "LOW_EFFICIENCY",
      severity: "Medium",
      trigger_value: kpi.completion_efficiency,
      threshold_value: 70.00,
      alert_message: "Efficiency below target",
      recommended_action: "Manager review",
      status: "Active",
      created_at: new Date().toISOString(),
      resolved_at: null
    });
  }

  // ALERT 2: Zero Jobs Closed (jobs_completed = 0)
  if (kpi.jobs_completed === 0 && kpi.jobs_assigned > 0) {
    alerts.push({
      employee_id: employeeId,
      alert_type: "ZERO_JOBS_CLOSED",
      severity: "High",
      trigger_value: 0.00,
      threshold_value: 1.00,
      alert_message: "No jobs completed today",
      recommended_action: "Immediate investigation",
      status: "Active",
      created_at: new Date().toISOString(),
      resolved_at: null
    });
  }

  // ALERT 3: Rework Detected
  // Check if this technician has a rework job today
  if (kpi.rework_count > 0) {
    alerts.push({
      employee_id: employeeId,
      alert_type: "REWORK_DETECTED",
      severity: "Critical",
      trigger_value: Number(kpi.rework_count),
      threshold_value: 0.00,
      alert_message: "Quality issue detected",
      recommended_action: "Quality review + training",
      status: "Active",
      created_at: new Date().toISOString(),
      resolved_at: null
    });
  }

  // ALERT 4: Low TML Claim Rate (< 5%)
  if (kpi.tml_claim_rate < 5 && kpi.jobs_completed > 0) {
    alerts.push({
      employee_id: employeeId,
      alert_type: "LOW_TML_CLAIM_RATE",
      severity: "Medium",
      trigger_value: kpi.tml_claim_rate,
      threshold_value: 5.00,
      alert_message: "Warranty claims below target",
      recommended_action: "Documentation review",
      status: "Active",
      created_at: new Date().toISOString(),
      resolved_at: null
    });
  }

  // Filter out duplicates. If there is already an active alert of the same type for this employee,
  // we don't want to create a duplicate.
  const activeAlerts = dbCache.productivityAlerts || [];
  const newAlerts = alerts.filter(newA => {
    const exists = activeAlerts.some(
      (oldA: ProductivityAlert) =>
        oldA.employee_id === newA.employee_id &&
        oldA.alert_type === newA.alert_type &&
        oldA.status === "Active"
    );
    return !exists;
  });

  return newAlerts;
}
