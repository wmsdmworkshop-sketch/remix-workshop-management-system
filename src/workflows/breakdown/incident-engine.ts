import { BreakdownIncident } from "./incident-models";
import { BreakdownCustomer } from "./customer-models";
import { BreakdownPriorityMatrix } from "./priority-matrix";
import { BreakdownSeverityMatrix } from "./severity-matrix";
import { BreakdownIncidentStatus } from "./constants";

export class BreakdownIncidentEngine {
  static createIncident(customer: BreakdownCustomer, breakdownType: string): BreakdownIncident {
    let priority = BreakdownPriorityMatrix.STANDARD;
    if (customer.is_vip || customer.female_passenger) {
      priority = BreakdownPriorityMatrix.VIP_CUSTOMER; // Using VIP as proxy for HIGH in this simplified logic
    }

    let severity = "MINOR";
    if (BreakdownSeverityMatrix.CRITICAL.includes(breakdownType)) {
      severity = "CRITICAL";
    } else if (BreakdownSeverityMatrix.MAJOR.includes(breakdownType)) {
      severity = "MAJOR";
    }

    return {
      incident_number: `INC-${Math.floor(Math.random() * 100000)}`,
      call_number: `CALL-${Math.floor(Math.random() * 100000)}`,
      customer_id: customer.customer_id,
      driver_name: customer.name,
      mobile_number: customer.phone,
      vehicle_vin: "UNKNOWN",
      registration_number: "UNKNOWN",
      current_odometer: 0,
      breakdown_date: new Date().toISOString(),
      breakdown_time: new Date().toISOString(),
      breakdown_type: breakdownType,
      complaint: "User reported breakdown",
      symptoms: [],
      severity,
      priority,
      status: BreakdownIncidentStatus.OPEN
    };
  }

  static assign(incident: BreakdownIncident): BreakdownIncident {
    return { ...incident, status: BreakdownIncidentStatus.ASSIGNED };
  }
}
