import { AlertLogRepository } from "./repository";

/**
 * Event-Driven Alert Service
 * Listens to domain events and translates them into actionable alerts
 * in the alert_logs table. 
 */
export class AlertService {
  constructor(
    private readonly alertLogRepo: AlertLogRepository,
    private readonly getCachedDB: () => any,
    private readonly saveDBLocal: (data: any) => void
  ) {}

  public async handleEvent(event: any, txConnection?: any) {
    const { event_type, job_id, payload } = event;
    const now = new Date().toISOString();
    
    // Using in-memory state for IDs like other services in this phase
    const cachedDB = this.getCachedDB();
    const nextAlertId = (cachedDB.alertLogs || []).length + 1;
    let alertCounter = 0;

    const newAlerts: any[] = [];

    switch (event_type) {
      case "WIP_STARTED":
        // Maybe notify about WIP started
        break;
      
      case "INTAKE_INITIALIZED":
        // Notify Service Advisor
        newAlerts.push({
          alert_id: nextAlertId + alertCounter++,
          alert_config_id: 1,
          entity_type: "JobCard",
          entity_id: job_id,
          alert_message: `Intake initialized for Job ${job_id}`,
          severity: "Medium",
          status: "Active",
          created_at: now
        });
        break;

      case "WorkflowTransitionOccurred":
        const { current_state } = payload;
        if (current_state === 'FINAL_REVIEW') {
          newAlerts.push({
            alert_id: nextAlertId + alertCounter++,
            alert_config_id: 1,
            entity_type: "JobCard",
            entity_id: job_id,
            alert_message: "Job ready for floor supervisor review",
            severity: "Medium",
            status: "Active",
            created_at: now
          });
        } else if (current_state === 'Completed') {
          newAlerts.push({
            alert_id: nextAlertId + alertCounter++,
            alert_config_id: 1,
            entity_type: "JobCard",
            entity_id: job_id,
            alert_message: "Job finished - QC check required",
            severity: "Medium",
            status: "Active",
            created_at: now
          });
        }
        break;
      
      case "ESTIMATE_APPROVED":
        newAlerts.push({
          alert_id: nextAlertId + alertCounter++,
          alert_config_id: 1,
          entity_type: "JobCard",
          entity_id: job_id,
          alert_message: "Estimate Approved - Proceed with repair",
          severity: "Medium",
          status: "Active",
          created_at: now
        });
        break;

      case "ESTIMATE_REJECTED":
        newAlerts.push({
          alert_id: nextAlertId + alertCounter++,
          alert_config_id: 1,
          entity_type: "JobCard",
          entity_id: job_id,
          alert_message: `Estimate rejected. Action Required.`,
          severity: "High",
          status: "Active",
          created_at: now
        });
        break;

      case "QC_FAILED":
        newAlerts.push({
          alert_id: nextAlertId + alertCounter++,
          alert_config_id: 2,
          entity_type: "JobCard",
          entity_id: job_id,
          alert_message: `QC Failed. Supervisor and Technician notified.`,
          severity: "High",
          status: "Active",
          created_at: now
        });
        break;

      case "QC_PASSED":
        newAlerts.push({
          alert_id: nextAlertId + alertCounter++,
          alert_config_id: 1,
          entity_type: "JobCard",
          entity_id: job_id,
          alert_message: "QC passed - manager review required",
          severity: "Medium",
          status: "Active",
          created_at: now
        });
        break;

      case "INVOICE_GENERATED":
        newAlerts.push({
          alert_id: nextAlertId + alertCounter++,
          alert_config_id: 1,
          entity_type: "JobCard",
          entity_id: job_id,
          alert_message: `Gate pass issued - vehicle ready for exit (Invoice ${payload.invoice_no})`,
          severity: "Medium",
          status: "Active",
          created_at: now
        });
        break;
    }

    if (newAlerts.length > 0) {
      for (const alert of newAlerts) {
        if (txConnection) {
          await this.alertLogRepo.create(alert, txConnection);
        } else {
          // Fallback if no transaction is active
          await this.alertLogRepo.create(alert, null as any);
        }
      }
      if (!cachedDB.alertLogs) cachedDB.alertLogs = [];
      cachedDB.alertLogs.push(...newAlerts);
      this.saveDBLocal(cachedDB);
    }
  }
}
