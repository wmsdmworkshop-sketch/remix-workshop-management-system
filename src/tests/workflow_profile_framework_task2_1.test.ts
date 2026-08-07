/**
 * DWIP Enterprise WOS - Task 2.1 Workflow Profile Framework Vitest Test Suite
 * Minimum 95% Coverage for Workflow Profile Framework
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vosService } from '../core/vos/services';
import { vosStateEngine } from '../core/vos/state/VosStateEngine';
import { vosTimelineEngine } from '../core/vos/timeline/VosTimelineEngine';
import { WorkflowResolver } from '../core/workflow/WorkflowResolver';
import { WorkflowPolicy } from '../core/workflow/WorkflowPolicy';
import { WorkflowCapability } from '../core/workflow/WorkflowCapability';
import { WorkflowProfileRegistry } from '../core/workflow/WorkflowProfileRegistry';
import { WorkflowProfileException } from '../core/workflow/WorkflowProfileException';
import { VisitType, CommercialType, EntrySource } from '../domain/vos/types';
import { StructuredLogger } from '../core/vos/utils/StructuredLogger';

describe('DWIP Enterprise WOS - Task 2.1 Workflow Profile Framework Test Suite', () => {
  let uniqueVehicleId: string;
  let uniqueCustomerId: string;

  beforeEach(() => {
    uniqueVehicleId = `veh_wf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    uniqueCustomerId = `cust_wf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    StructuredLogger.clearLogsForTest();
  });

  it('1. Profile Resolution: Should resolve all 7 operational workflow profiles accurately', async () => {
    // 1. STANDARD_SERVICE
    const stdProfile = WorkflowResolver.resolveByCode('STANDARD_SERVICE');
    expect(stdProfile.code).toBe('STANDARD_SERVICE');
    expect(stdProfile.permittedStates.length).toBe(9);

    // 2. BREAKDOWN
    const bdProfile = WorkflowResolver.resolveByCode('BREAKDOWN');
    expect(bdProfile.code).toBe('BREAKDOWN');
    expect(bdProfile.capabilities).toContain(WorkflowCapability.FAST_TRACK);
    expect(bdProfile.capabilities).toContain(WorkflowCapability.QRT_DISPATCH);

    // 3. WARRANTY
    const warProfile = WorkflowResolver.resolveByCode('WARRANTY');
    expect(warProfile.code).toBe('WARRANTY');
    expect(warProfile.capabilities).toContain(WorkflowCapability.OEM_PRE_APPROVAL);

    // 4. AMC
    const amcProfile = WorkflowResolver.resolveByCode('AMC');
    expect(amcProfile.code).toBe('AMC');
    expect(amcProfile.capabilities).toContain(WorkflowCapability.PREPAID_CONTRACT);

    // 5. GOODWILL
    const gwProfile = WorkflowResolver.resolveByCode('GOODWILL');
    expect(gwProfile.code).toBe('GOODWILL');
    expect(gwProfile.capabilities).toContain(WorkflowCapability.GM_CONCESSION_APPROVAL);

    // 6. FSB_CAMPAIGN
    const fsbProfile = WorkflowResolver.resolveByCode('FSB_CAMPAIGN');
    expect(fsbProfile.code).toBe('FSB_CAMPAIGN');
    expect(fsbProfile.capabilities).toContain(WorkflowCapability.RECALL_CAMPAIGN_WORK);

    // 7. INTERNAL
    const intProfile = WorkflowResolver.resolveByCode('INTERNAL');
    expect(intProfile.code).toBe('INTERNAL');
    expect(intProfile.capabilities).toContain(WorkflowCapability.INTERNAL_DIRECT_WORK);
  });

  it('2. Breakdown Profile Fast-Track Transition: Should permit GATE_IN -> WORK_IN_PROGRESS directly for breakdown VOS', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12BD1001',
      chassisNumber: 'CHASSIS-BD-1001',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent',
      visitType: VisitType.BREAKDOWN,
      isBreakdown: true
    });

    const activeProfile = WorkflowResolver.resolveForVos(vos);
    expect(activeProfile.code).toBe('BREAKDOWN');

    // Fast-track transition directly to WORK_IN_PROGRESS
    const res = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'WORK_IN_PROGRESS',
      actorId: 'usr_supervisor_1',
      actorRole: 'floor_supervisor',
      reason: 'Emergency roadside breakdown fast-track intake'
    });

    expect(res.currentState).toBe('WORK_IN_PROGRESS');
  });

  it('3. Unpermitted State Rejection: Should reject unpermitted state transitions for profile', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12BD1002',
      chassisNumber: 'CHASSIS-BD-1002',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent',
      visitType: VisitType.BREAKDOWN,
      isBreakdown: true
    });

    // Breakdown profile does not permit INSPECTION state
    await expect(
      vosStateEngine.transitionState({
        vosId: vos.id,
        targetState: 'INSPECTION',
        actorId: 'usr_advisor_1',
        actorRole: 'service_advisor'
      })
    ).rejects.toThrow(WorkflowProfileException);
  });

  it('4. Capability Validation: Should enforce and validate profile capabilities', async () => {
    const bdProfile = WorkflowResolver.resolveByCode('BREAKDOWN');
    const stdProfile = WorkflowResolver.resolveByCode('STANDARD_SERVICE');

    // Breakdown has FAST_TRACK
    expect(() => WorkflowPolicy.validateCapability(bdProfile, WorkflowCapability.FAST_TRACK)).not.toThrow();

    // Standard Service lacks FAST_TRACK capability
    expect(() => WorkflowPolicy.validateCapability(stdProfile, WorkflowCapability.FAST_TRACK)).toThrow(
      WorkflowProfileException
    );
  });

  it('5. Unsupported Profile Exception: Should throw WorkflowProfileException for unknown profile', async () => {
    expect(() => WorkflowResolver.resolveByCode('UNKNOWN_INVALID_PROFILE')).toThrow(
      WorkflowProfileException
    );
  });

  it('6. End-to-End Breakdown Management Capability: Should execute complete Breakdown lifecycle', async () => {
    // 1. Create Breakdown VOS Session
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12BD9999',
      chassisNumber: 'CHASSIS-BD-9999',
      createdBy: 'usr_qrt_agent',
      currentOwner: 'usr_qrt_agent',
      visitType: VisitType.BREAKDOWN,
      commercialType: CommercialType.CUSTOMER_PAY,
      entrySource: EntrySource.MANUAL,
      isBreakdown: true
    });

    expect(vos.currentState).toBe('GATE_IN');

    // 2. Fast-Track GATE_IN -> WORK_IN_PROGRESS
    const res1 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'WORK_IN_PROGRESS',
      actorId: 'usr_supervisor_1',
      actorRole: 'floor_supervisor',
      reason: 'QRT breakdown vehicle allocated immediately to Bay 2'
    });
    expect(res1.currentState).toBe('WORK_IN_PROGRESS');

    // 3. WORK_IN_PROGRESS -> QUALITY_CHECK
    const res2 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'QUALITY_CHECK',
      actorId: 'usr_qc_1',
      actorRole: 'qc_inspector',
      reason: 'Breakdown repair completed, QC verified'
    });
    expect(res2.currentState).toBe('QUALITY_CHECK');

    // 4. QUALITY_CHECK -> READY_FOR_DELIVERY
    const res3 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'READY_FOR_DELIVERY',
      actorId: 'usr_qc_1',
      actorRole: 'qc_inspector',
      reason: 'Road test passed for breakdown vehicle',
      ruleData: { qualityPassed: true }
    });
    expect(res3.currentState).toBe('READY_FOR_DELIVERY');

    // 5. READY_FOR_DELIVERY -> GATE_OUT
    const res4 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'GATE_OUT',
      actorId: 'usr_sec_agent',
      actorRole: 'security_agent',
      reason: 'Customer collected breakdown vehicle',
      ruleData: { invoiceGenerated: true, paymentSettled: true }
    });
    expect(res4.currentState).toBe('GATE_OUT');

    // 6. GATE_OUT -> CLOSED
    const res5 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'CLOSED',
      actorId: 'usr_sec_agent',
      actorRole: 'security_agent',
      reason: 'Breakdown operational session closed'
    });
    expect(res5.currentState).toBe('CLOSED');

    // Verify timeline records
    const timeline = await vosTimelineEngine.queryEvents({ vosId: vos.id });
    expect(timeline.length).toBeGreaterThanOrEqual(5);
  });
});
