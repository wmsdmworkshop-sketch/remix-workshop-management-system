/**
 * DWIP Enterprise Platform - Breakdown & QRT Module Test Suite
 * Sprint: DWIP-S2-001 Revision-9 (Tow-to-Workshop Operational Hardening)
 * Architecture: DWIP-INT-ARCH-001 v1.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { breakdownCaseService } from '../modules/breakdown/BreakdownCaseService';
import { qrtDispatchService } from '../modules/qrt/QrtDispatchService';
import { QrtReachSlaEngine } from '../modules/breakdown/QrtReachSlaEngine';
import { vosService } from '../core/vos/services/VosService';
import { StructuredLogger } from '../core/vos/utils/StructuredLogger';
import { TowingMilestoneEventPayload } from '../modules/breakdown/types';

describe('DWIP Breakdown & QRT Module Test Suite (DWIP-S2-001 Revision-9)', () => {
  beforeEach(() => {
    breakdownCaseService.clear();
    qrtDispatchService.clear();
    StructuredLogger.clearLogsForTest();
  });

  it('1. Breakdown Creation & VOS Linkage: Should create BreakdownCase linked to VOS session with NotificationOrigin', async () => {
    const bkd = await breakdownCaseService.createBreakdownCase({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      userId: 'usr_sec_1',
      registrationNumber: 'MH12AB1001',
      vin: 'VIN_BKD_9001',
      customerCode: 'CUST_FLEET_01',
      category: 'ENGINE',
      severity: 'HIGH',
      location: { latitude: 18.5204, longitude: 73.8567, accuracyMeters: 5, timestamp: new Date().toISOString() },
      complaintSummary: 'Engine Overheating on Highway',
      complaintRegisteredAt: '2026-07-31T10:00:00Z',
      origin: 'QRT_APP'
    });

    expect(bkd.id).toBeDefined();
    expect(bkd.origin).toBe('QRT_APP');
    expect(bkd.reachSla.targetMinutes).toBe(120); // 10:00 is Day Window (2h)

    const vos = await vosService.query.getById(bkd.vosId);
    expect(vos?.visitType).toBe('BREAKDOWN');
  });

  it('2. QrtReachSlaEngine Day vs Night Windows: Should enforce 2h Day and 4h Night SLAs from ComplaintRegisteredAt', () => {
    // Day Window (10:00 AM)
    const daySla = QrtReachSlaEngine.calculateSla('2026-07-31T10:00:00Z', '2026-07-31T11:30:00Z');
    expect(daySla.isNightWindow).toBe(false);
    expect(daySla.targetMinutes).toBe(120);
    expect(daySla.slaStatus).toBe('ON_TRACK');

    // Night Window (23:00 PM)
    const nightSla = QrtReachSlaEngine.calculateSla('2026-07-31T23:00:00Z', '2026-08-01T02:30:00Z');
    expect(nightSla.isNightWindow).toBe(true);
    expect(nightSla.targetMinutes).toBe(240);
    expect(nightSla.slaStatus).toBe('ON_TRACK');
  });

  it('3. QRT Dispatch & Arrival: Should dispatch QRT team and log arrival timestamp for SLA stop', async () => {
    const bkd = await breakdownCaseService.createBreakdownCase({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      userId: 'usr_sec_1',
      registrationNumber: 'MH12AB1002',
      vin: 'VIN_BKD_9002',
      customerCode: 'CUST_FLEET_02',
      category: 'BRAKE_SYSTEM',
      severity: 'CRITICAL',
      location: { latitude: 18.5204, longitude: 73.8567, accuracyMeters: 5, timestamp: new Date().toISOString() },
      complaintSummary: 'Brake Fluid Leakage',
      complaintRegisteredAt: '2026-07-31T10:00:00Z'
    });

    const dispatch = await qrtDispatchService.dispatchQrt({
      breakdownId: bkd.id,
      vehicle: { vehicleId: 'V1', registrationNumber: 'MH12QRT01', vanModel: 'Tata Winger QRT', equipmentKitId: 'KIT01' },
      teamMembers: [
        { memberId: 'M1', name: 'Amit Kumar', role: 'TEAM_LEADER', phone: '+919876543210' },
        { memberId: 'M2', name: 'Suresh Patil', role: 'TECHNICIAN', phone: '+919876543211' }
      ],
      equipmentKit: { kitId: 'KIT01', diagnosticsScanner: true, batteryJumper: true, airCompressor: true, toolSet: true, sparePartsInventory: ['Brake Hose'] },
      dispatchedBy: 'usr_dispatcher'
    });

    expect(dispatch.status).toBe('DISPATCHED');

    const arrived = await qrtDispatchService.markArrived(dispatch.dispatchId, { latitude: 18.521, longitude: 73.858, accuracyMeters: 3, timestamp: new Date().toISOString() });
    expect(arrived.status).toBe('ARRIVED');
  });

  it('4. Tow-to-Workshop 8-Step Lifecycle & Milestone Events: Should execute complete towing lifecycle within SINGLE VOS', async () => {
    const bkd = await breakdownCaseService.createBreakdownCase({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      userId: 'usr_sec_1',
      registrationNumber: 'MH12AB1003',
      vin: 'VIN_BKD_9003',
      customerCode: 'CUST_FLEET_03',
      category: 'GEARBOX',
      severity: 'HIGH',
      location: { latitude: 18.5204, longitude: 73.8567, accuracyMeters: 5, timestamp: new Date().toISOString() },
      complaintSummary: 'Gearbox Jammed',
      complaintRegisteredAt: '2026-07-31T10:00:00Z'
    });

    const eventsFired: string[] = [];
    breakdownCaseService.subscribeMilestone((e: TowingMilestoneEventPayload) => {
      eventsFired.push(e.eventType);
    });

    // Step 1: Tow Requested
    const tow1 = await breakdownCaseService.towRequested(bkd.id, 'TOW_PROVIDER_EXPRESS', 45);
    expect(tow1.status).toBe('TOW_REQUESTED');

    // Step 2: Tow Assigned
    const tow2 = await breakdownCaseService.towAssigned(bkd.id, 'TOW_TRUCK_99');
    expect(tow2.status).toBe('TOW_ASSIGNED');

    // Step 3: Vehicle Loaded
    const tow3 = await breakdownCaseService.vehicleLoaded(bkd.id);
    expect(tow3.status).toBe('VEHICLE_LOADED');

    // Step 4: Tow Started
    const tow4 = await breakdownCaseService.towStarted(bkd.id);
    expect(tow4.status).toBe('TOW_STARTED');

    // Step 5: Workshop ETA Updated
    const tow5 = await breakdownCaseService.updateWorkshopEta(bkd.id, '2026-07-31T11:45:00Z', 'Highway Congestion');
    expect(tow5.etaTracking.currentEta).toBe('2026-07-31T11:45:00Z');

    // Step 6: Workshop Arrived
    const tow6 = await breakdownCaseService.workshopArrived(bkd.id);
    expect(tow6.status).toBe('WORKSHOP_ARRIVED');
    expect(tow6.preparation.workshopReady).toBe(true);

    // Step 7: Create Gate Entry (VOS session continues)
    const updatedCase1 = await breakdownCaseService.createGateEntry(bkd.id);
    expect(updatedCase1.status).toBe('TRANSFERRED_TO_WORKSHOP');

    // Step 8: Create Job Card (VOS session continues to WORK_IN_PROGRESS)
    const updatedCase2 = await breakdownCaseService.createJobCard(bkd.id);
    expect(updatedCase2.timestamps.jobCardCreatedAt).toBeDefined();

    // Verify SAME VOS session was preserved without duplication
    expect(updatedCase2.vosId).toBe(bkd.vosId);
    const vos = await vosService.query.getById(bkd.vosId);
    expect(vos?.currentState).toBe('WORK_IN_PROGRESS');

    // Verify 8 milestone events fired
    expect(eventsFired).toContain('TowRequested');
    expect(eventsFired).toContain('TowAssigned');
    expect(eventsFired).toContain('VehicleLoaded');
    expect(eventsFired).toContain('TowStarted');
    expect(eventsFired).toContain('WorkshopETAUpdated');
    expect(eventsFired).toContain('WorkshopArrived');
    expect(eventsFired).toContain('GateEntryCreated');
    expect(eventsFired).toContain('JobCardCreated');
  });

  it('5. Workshop Manager Dashboard & Media Attachment: Should list incoming breakdown tow items and attach media', async () => {
    const bkd = await breakdownCaseService.createBreakdownCase({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      userId: 'usr_sec_1',
      registrationNumber: 'MH12AB1004',
      vin: 'VIN_BKD_9004',
      customerCode: 'CUST_FLEET_04',
      category: 'ACCIDENT',
      severity: 'VEHICLE_BLOCKING',
      location: { latitude: 18.5204, longitude: 73.8567, accuracyMeters: 5, timestamp: new Date().toISOString() },
      complaintSummary: 'Accident damage to front axle',
      complaintRegisteredAt: '2026-07-31T10:00:00Z'
    });

    await breakdownCaseService.towRequested(bkd.id, 'TOW_PROVIDER_EXPRESS');

    const dashboard = breakdownCaseService.getIncomingBreakdowns();
    expect(dashboard.length).toBe(1);
    expect(dashboard[0].registrationNumber).toBe('MH12AB1004');

    const media = await breakdownCaseService.attachMedia(bkd.id, 'VEHICLE_FRONT', 'front_damage.jpg', 'image/jpeg', new Uint8Array([1, 2, 3]));
    expect(media.category).toBe('VEHICLE_FRONT');
  });
});
