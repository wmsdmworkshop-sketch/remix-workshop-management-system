/**
 * DWIP Enterprise WOS - Task 1.4 Timeline Engine Vitest Test Suite
 * Minimum 95% Coverage for VOS Timeline Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vosService } from '../core/vos/services';
import { vosStateEngine } from '../core/vos/state/VosStateEngine';
import { vosTimelineEngine } from '../core/vos/timeline/VosTimelineEngine';
import { TimelineEventTypes } from '../core/vos/timeline/types';
import { VosTimelineException } from '../core/vos/timeline/VosTimelineException';
import { TimelineCategory, SlaStatus, VisitType, CommercialType, EntrySource } from '../domain/vos/types';
import { StructuredLogger } from '../core/vos/utils/StructuredLogger';

describe('DWIP Enterprise WOS - Task 1.4 VOS Timeline Engine Test Suite', () => {
  let uniqueVehicleId: string;
  let uniqueCustomerId: string;

  beforeEach(() => {
    uniqueVehicleId = `veh_tl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    uniqueCustomerId = `cust_tl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    StructuredLogger.clearLogsForTest();
  });

  it('1. Operational Event Creation: Should append and query operational timeline event', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12TL1001',
      chassisNumber: 'CHASSIS-TL-1001',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const record = await vosTimelineEngine.recordOperationalEvent(
      vos.id,
      TimelineEventTypes.GATE_IN_REGISTERED,
      'Vehicle Gate Entry Completed',
      'ANPR camera registered vehicle at Gate 1',
      { camera: 'CAM_01', confidence: 0.99 }
    );

    expect(record.id).toBeDefined();
    expect(record.vosId).toBe(vos.id);
    expect(record.timelineCategory).toBe(TimelineCategory.OPERATIONAL);
    expect(record.eventType).toBe(TimelineEventTypes.GATE_IN_REGISTERED);

    const timeline = await vosTimelineEngine.queryEvents({ vosId: vos.id });
    expect(timeline.length).toBeGreaterThanOrEqual(1);
  });

  it('2. SLA Event Creation: Should append SLA warning and breach milestone events', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12TL1002',
      chassisNumber: 'CHASSIS-TL-1002',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const warning = await vosTimelineEngine.recordSlaEvent(
      vos.id,
      SlaStatus.WARNING,
      'SLA Warning 70% Reached',
      'Diagnostic phase exceeded 45 minutes',
      { maxTargetMinutes: 60, currentMinutes: 46 }
    );

    expect(warning.slaStatus).toBe(SlaStatus.WARNING);
    expect(warning.timelineCategory).toBe(TimelineCategory.INTERNAL_SLA);

    const breach = await vosTimelineEngine.recordSlaEvent(
      vos.id,
      SlaStatus.BREACHED,
      'SLA Breach Threshold Breached',
      'Diagnostic phase exceeded 60 minutes target',
      { maxTargetMinutes: 60, currentMinutes: 65 }
    );

    expect(breach.slaStatus).toBe(SlaStatus.BREACHED);
  });

  it('3. OEM Event Creation: Should append OEM recall and telematics events', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12TL1003',
      chassisNumber: 'CHASSIS-TL-1003',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const oemEvt = await vosTimelineEngine.recordOemEvent(
      vos.id,
      TimelineEventTypes.OEM_CAMPAIGN_FLAGGED,
      'OEM Recall Campaign Active',
      'Campaign CAM-2026-09 Fuel Sensor Replacement mandatory',
      { campaignId: 'CAM-2026-09', partsRequired: ['PART-SENSOR-09'] }
    );

    expect(oemEvt.timelineCategory).toBe(TimelineCategory.OEM);
    expect(oemEvt.eventType).toBe(TimelineEventTypes.OEM_CAMPAIGN_FLAGGED);
  });

  it('4. Allowed Duplicates: Should allow multiple telemetry scans on the same VOS', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12TL1004',
      chassisNumber: 'CHASSIS-TL-1004',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    // Scan 1
    await vosTimelineEngine.appendEvent({
      vosId: vos.id,
      timelineCategory: TimelineCategory.OPERATIONAL,
      eventType: TimelineEventTypes.TELEMETRY_SCAN,
      title: 'IoT Telemetry Scan 1',
      source: 'INTEGRATION',
      structuredMetadata: { engineTempC: 85 }
    });

    // Scan 2 (Allowed duplicate)
    const scan2 = await vosTimelineEngine.appendEvent({
      vosId: vos.id,
      timelineCategory: TimelineCategory.OPERATIONAL,
      eventType: TimelineEventTypes.TELEMETRY_SCAN,
      title: 'IoT Telemetry Scan 2',
      source: 'INTEGRATION',
      structuredMetadata: { engineTempC: 88 }
    });

    expect(scan2.id).toBeDefined();
  });

  it('5. Rejected Duplicates: Should reject second entry for deduplicated milestone event', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12TL1005',
      chassisNumber: 'CHASSIS-TL-1005',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    // Entry 1
    await vosTimelineEngine.recordOperationalEvent(
      vos.id,
      TimelineEventTypes.WORK_STARTED,
      'Work Started in Bay 1'
    );

    // Entry 2 (Restricted duplicate)
    await expect(
      vosTimelineEngine.recordOperationalEvent(
        vos.id,
        TimelineEventTypes.WORK_STARTED,
        'Duplicate Work Started Attempt'
      )
    ).rejects.toThrow(VosTimelineException);
  });

  it('6. Invalid Category & Unknown Event Type: Should throw VosTimelineException', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12TL1006',
      chassisNumber: 'CHASSIS-TL-1006',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    // Invalid Category
    await expect(
      vosTimelineEngine.appendEvent({
        vosId: vos.id,
        timelineCategory: 'INVALID_CAT' as any,
        eventType: TimelineEventTypes.GATE_IN_REGISTERED,
        title: 'Test',
        source: 'SYSTEM'
      })
    ).rejects.toThrow(VosTimelineException);

    // Unknown Event Type
    await expect(
      vosTimelineEngine.appendEvent({
        vosId: vos.id,
        timelineCategory: TimelineCategory.OPERATIONAL,
        eventType: 'UNKNOWN_EVT_TYPE_XYZ',
        title: 'Test',
        source: 'SYSTEM'
      })
    ).rejects.toThrow(VosTimelineException);
  });

  it('7. Automatic State Transition Events: StateEngine transitions should automatically record timeline entries', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12TL1007',
      chassisNumber: 'CHASSIS-TL-1007',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    // Transition state to INSPECTION
    await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'INSPECTION',
      actorId: 'usr_advisor_1',
      actorRole: 'service_advisor',
      reason: 'Vehicle walked around by advisor'
    });

    const timeline = await vosTimelineEngine.queryEvents({ vosId: vos.id });
    const transitionNode = timeline.find(t => t.eventType === TimelineEventTypes.STATE_TRANSITION);
    expect(transitionNode).toBeDefined();
    expect(transitionNode?.title).toContain('GATE_IN -> INSPECTION');
  });

  it('8. Chronological Ordering: Query should return records sorted by recordedAt timestamp ascending', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12TL1008',
      chassisNumber: 'CHASSIS-TL-1008',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await vosTimelineEngine.appendEvent({
      vosId: vos.id,
      timelineCategory: TimelineCategory.OPERATIONAL,
      eventType: TimelineEventTypes.TELEMETRY_SCAN,
      title: 'Scan Early',
      source: 'SYSTEM',
      recordedAt: new Date(Date.now() - 5000).toISOString()
    });

    await vosTimelineEngine.appendEvent({
      vosId: vos.id,
      timelineCategory: TimelineCategory.OPERATIONAL,
      eventType: TimelineEventTypes.TELEMETRY_SCAN,
      title: 'Scan Late',
      source: 'SYSTEM',
      recordedAt: new Date(Date.now()).toISOString()
    });

    const sorted = await vosTimelineEngine.queryEvents({ vosId: vos.id });
    expect(sorted.length).toBeGreaterThanOrEqual(2);
    const t0 = new Date(sorted[0].recordedAt).getTime();
    const t1 = new Date(sorted[1].recordedAt).getTime();
    expect(t0).toBeLessThanOrEqual(t1);
  });
});
