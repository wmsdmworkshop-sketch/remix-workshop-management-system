/**
 * =============================================================================
 * DWIP Customer Experience — CRM Service Engine
 * Module: platforms/customer-experience/crm-service.ts
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type { Customer360, Fleet360, CRMLead, CRMAppointment, CRMCampaign, CustomerTimelineEvent } from "./types";

export class CRMService {
  constructor(
    private readonly getCachedDB: () => any,
    private readonly saveDBLocal: (data: any) => void
  ) {}

  /**
   * Consolidates Customer 360 data including purchase, service timeline, and loyalty points.
   */
  public getCustomer360(customerId: string): Customer360 | undefined {
    const cachedDB = this.getCachedDB();
    const customer = cachedDB.employees?.find((e: any) => String(e.employee_id) === customerId) || 
                     cachedDB.jobCards?.find((j: any) => String(j.customer_mobile) === customerId);

    if (!customer) return undefined;

    const mobile = customer.customer_mobile || customer.mobile;
    const name = customer.customer_name || customer.full_name;

    // Filter jobs for this customer
    const customerJobs = (cachedDB.jobCards || []).filter((j: any) => j.customer_mobile === mobile);
    
    // Construct timeline events
    const timeline: CustomerTimelineEvent[] = customerJobs.map((j: any) => ({
      eventId: `TL-${j.job_id}`,
      customerId,
      interactionType: "SERVICE",
      timestamp: j.created_at || new Date().toISOString(),
      description: `Service completed for job card ${j.job_card_no} with status ${j.status}. Description: ${j.job_description}`,
      details: { job_id: j.job_id, status: j.status }
    }));

    const totalInvoiceSpent = customerJobs.reduce((sum: number, j: any) => sum + (j.estimated_amount || 0), 0);

    return {
      customerId,
      fullName: name,
      mobile,
      customerSegment: "STANDARD",
      registeredDate: new Date().toISOString(),
      totalVisitsCount: customerJobs.length,
      totalInvoiceSpent,
      loyaltyPoints: Math.floor(totalInvoiceSpent / 100), // 1 point per 100 INR spent
      timeline,
      activeContracts: {
        warranty: true,
        amc: false
      }
    };
  }

  /**
   * Consolidates Fleet 360 view for enterprise fleet accounts.
   */
  public getFleet360(fleetOwnerId: string): Fleet360 | undefined {
    const cachedDB = this.getCachedDB();
    const jobs = cachedDB.jobCards || [];
    const fleetJobs = jobs.filter((j: any) => j.workflow_type === "Fleet" || j.workflow_type === "AMC");

    const activeVins = Array.from(new Set(fleetJobs.map((j: any) => j.vin).filter(Boolean))) as string[];

    return {
      fleetOwnerId,
      organizationName: `Enterprise Fleet ${fleetOwnerId}`,
      contactName: "Fleet Logistics Admin",
      contactMobile: "+919999900000",
      totalVehiclesCount: activeVins.length,
      activeContractsCount: 1,
      vehiclesList: activeVins,
      totalOutstandingDues: 0
    };
  }

  /**
   * Registers a new lead/prospect.
   */
  public createLead(lead: Omit<CRMLead, "leadId" | "createdAt" | "updatedAt">): CRMLead {
    const cachedDB = this.getCachedDB();
    if (!cachedDB.crmLeads) cachedDB.crmLeads = [];

    const newLead: CRMLead = {
      leadId: `LD-${randomUUID().substring(0, 8).toUpperCase()}`,
      ...lead,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    cachedDB.crmLeads.push(newLead);
    this.saveDBLocal(cachedDB);

    return newLead;
  }

  /**
   * Schedules a service or sales appointment.
   */
  public scheduleAppointment(appointment: Omit<CRMAppointment, "appointmentId">): CRMAppointment {
    const cachedDB = this.getCachedDB();
    if (!cachedDB.crmAppointments) cachedDB.crmAppointments = [];

    const newAppt: CRMAppointment = {
      appointmentId: `AP-${randomUUID().substring(0, 8).toUpperCase()}`,
      ...appointment,
    };

    cachedDB.crmAppointments.push(newAppt);
    this.saveDBLocal(cachedDB);

    return newAppt;
  }
}
