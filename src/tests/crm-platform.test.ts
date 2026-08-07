import { describe, it, expect, beforeEach } from "vitest";
import { CRMService } from "../platforms/customer-experience/crm-service";

describe("Customer Experience Platform (CRM) Tests", () => {
  let crmService: CRMService;
  let mockDB: any;

  beforeEach(() => {
    mockDB = {
      employees: [
        { employee_id: 1, full_name: "Jane Smith", role: "Service Manager", mobile: "+919876543211", is_active: true }
      ],
      jobCards: [
        { job_id: 1, job_card_no: "JC001", customer_mobile: "+919876543211", customer_name: "Jane Smith", estimated_amount: 5000, status: "Completed", workflow_type: "AMC" }
      ],
      crmLeads: [],
      crmAppointments: []
    };

    crmService = new CRMService(
      () => mockDB,
      (data) => { mockDB = data; }
    );
  });

  it("should generate a Customer 360 profile with interactions timeline and loyalty points", () => {
    const profile = crmService.getCustomer360("1");
    expect(profile).toBeDefined();
    expect(profile?.fullName).toBe("Jane Smith");
    expect(profile?.loyaltyPoints).toBe(50); // 5000 / 100
    expect(profile?.timeline.length).toBe(1);
    expect(profile?.timeline[0].interactionType).toBe("SERVICE");
  });

  it("should generate a Fleet 360 profile", () => {
    const profile = crmService.getFleet360("FLEET-001");
    expect(profile).toBeDefined();
    expect(profile?.totalVehiclesCount).toBe(0); // mock jobCards doesn't have VIN
  });

  it("should create new leads and register appointments", () => {
    const lead = crmService.createLead({
      customerName: "Alice Cooper",
      contactMobile: "+919876543299",
      interestSource: "Web",
      interestCategory: "AMC",
      currentStatus: "NEW",
      assignedTo: "1"
    });

    expect(lead.leadId).toBeDefined();
    expect(mockDB.crmLeads.length).toBe(1);

    const appt = crmService.scheduleAppointment({
      customerId: "1",
      vehicleVin: "VIN12345",
      scheduledTime: new Date().toISOString(),
      serviceAdvisorId: "1",
      status: "SCHEDULED",
      createdBy: "1"
    });

    expect(appt.appointmentId).toBeDefined();
    expect(mockDB.crmAppointments.length).toBe(1);
  });
});
