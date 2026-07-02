import { Employee, TechnicianKPIDaily, ProductivityAlert, AlertLog } from "../types";
import { calculateTechnicianKPIs } from "./technician-kpi-calculator";
import { checkAndGenerateAlerts } from "./productivity-alerts";

// Helper to filter technicians
export function isTechnicianRole(role: string): boolean {
  const r = (role || "").toLowerCase();
  const nonTechRoles = [
    "biller", "developer", "admin", "service_manager", "manager", 
    "supervisor", "accounts", "service_advisor", "advisor", 
    "reception", "gate", "spare_parts", "parts", "warranty", "cashier"
  ];
  return !nonTechRoles.some(x => r.includes(x));
}

export async function runDailyKPISnapshot(
  kpiDate: string, // YYYY-MM-DD
  dbCache: any,
  setDB: (db: any) => void
): Promise<{
  techniciansProcessed: number;
  alertsGenerated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let techniciansProcessed = 0;
  let alertsGenerated = 0;

  try {
    // 1. Get all active technicians
    const technicians = (dbCache.employees || []).filter(
      (e: Employee) => e.is_active && isTechnicianRole(e.role)
    );

    dbCache.technicianKpiDailies = dbCache.technicianKpiDailies || [];
    dbCache.productivityAlerts = dbCache.productivityAlerts || [];
    dbCache.alertLogs = dbCache.alertLogs || [];

    let nextKpiId = dbCache.technicianKpiDailies.reduce(
      (max: number, k: TechnicianKPIDaily) => Math.max(max, k.id),
      0
    ) + 1;

    let nextAlertId = dbCache.productivityAlerts.reduce(
      (max: number, a: ProductivityAlert) => Math.max(max, a.id),
      0
    ) + 1;

    let nextAlertLogId = dbCache.alertLogs.reduce(
      (max: number, l: AlertLog) => Math.max(max, l.alert_id),
      0
    ) + 1;

    const newKpis: TechnicianKPIDaily[] = [];
    const newAlerts: ProductivityAlert[] = [];

    // 2. Loop through each technician
    for (const tech of technicians) {
      try {
        // a) Calculate 22 KPIs
        const kpi = calculateTechnicianKPIs(tech.employee_id, kpiDate, dbCache);

        // Remove previous snapshot for this tech and date to avoid duplicates
        dbCache.technicianKpiDailies = dbCache.technicianKpiDailies.filter(
          (k: TechnicianKPIDaily) =>
            !(k.employee_id === tech.employee_id && k.kpi_date === kpiDate)
        );

        // b) Store KPI record
        const kpiRecord: TechnicianKPIDaily = {
          id: nextKpiId++,
          ...kpi
        };
        newKpis.push(kpiRecord);
        dbCache.technicianKpiDailies.push(kpiRecord);

        // c) Check productivity alerts triggers
        const triggered = checkAndGenerateAlerts(kpi, dbCache);
        triggered.forEach(alert => {
          const alertRecord: ProductivityAlert = {
            id: nextAlertId++,
            ...alert
          };
          newAlerts.push(alertRecord);
          dbCache.productivityAlerts.push(alertRecord);
          alertsGenerated++;

          // Also log a system notification in alertLogs
          dbCache.alertLogs.push({
            alert_id: nextAlertLogId++,
            alert_config_id: 99, // custom code for productivity engine
            entity_type: "Employee",
            entity_id: tech.employee_id,
            alert_message: `[Productivity Alert - ${alert.alert_type}] ${tech.full_name}: ${alert.alert_message} (Severity: ${alert.severity})`,
            severity: alert.severity,
            status: "Active",
            acknowledged_by: null,
            acknowledged_at: null,
            resolved_at: null,
            created_at: new Date().toISOString()
          });
        });

        techniciansProcessed++;
      } catch (err: any) {
        console.error(`Error processing KPIs for tech ${tech.full_name}:`, err);
        errors.push(`Tech ${tech.full_name}: ${err.message || err}`);
      }
    }

    // Add a summary system alert log
    dbCache.alertLogs.push({
      alert_id: nextAlertLogId++,
      alert_config_id: 100,
      entity_type: "System",
      entity_id: 1,
      alert_message: `KPI Snapshot completed for ${kpiDate}. Processed ${techniciansProcessed} technicians, generated ${alertsGenerated} alerts.`,
      severity: "Low",
      status: "Active",
      acknowledged_by: null,
      acknowledged_at: null,
      resolved_at: null,
      created_at: new Date().toISOString()
    });

    // Save changes
    setDB(dbCache);

    console.log(
      `Daily KPI snapshot job completed for ${kpiDate}. Processed: ${techniciansProcessed}, Alerts: ${alertsGenerated}`
    );
  } catch (err: any) {
    console.error("Critical error in daily KPI snapshot job:", err);
    errors.push(`Job Error: ${err.message || err}`);
  }

  return {
    techniciansProcessed,
    alertsGenerated,
    errors
  };
}
