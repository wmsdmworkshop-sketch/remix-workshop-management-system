/**
 * DWIP Enterprise WOS - Task 1.3 State Engine Vitest Test Suite
 * Minimum 95% Coverage for VOS State Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vosService } from '../core/vos/services';
import { vosStateEngine } from '../core/vos/state/VosStateEngine';
import { VosStateException } from '../core/vos/state/VosStateException';
import { StructuredLogger } from '../core/vos/utils/StructuredLogger';
import { VisitType, CommercialType, EntrySource } from '../domain/vos/types';

describe('DWIP Enterprise WOS - Task 1.3 VOS State Engine Test Suite', () => {
  let uniqueVehicleId: string;
  let uniqueCustomerId: string;

  beforeEach(() => {
    uniqueVehicleId = `veh_st_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    uniqueCustomerId = `cust_st_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    StructuredLogger.clearLogsForTest();
  });

  it('1. Valid Transition Sequence: Should transition through complete lifecycle', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB1001',
      chassisNumber: 'CHASSIS-1001-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent',
      visitType: VisitType.NORMAL_SERVICE,
      commercialType: CommercialType.CUSTOMER_PAY,
      entrySource: EntrySource.ANPR
    });

    expect(vos.currentState).toBe('GATE_IN');

    // 1. GATE_IN -> INSPECTION
    const res1 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'INSPECTION',
      actorId: 'usr_advisor_1',
      actorRole: 'service_advisor',
      reason: 'Started 360 vehicle walkaround inspection'
    });
    expect(res1.currentState).toBe('INSPECTION');
    expect(res1.stateCode).toBe('STATE_INSPECTION');
    expect(res1.ownershipHandoverTriggered).toBe(true);

    // 2. INSPECTION -> ESTIMATION
    const res2 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'ESTIMATION',
      actorId: 'usr_advisor_1',
      actorRole: 'service_advisor',
      reason: 'Inspection completed, preparing cost estimate',
      ruleData: { inspectionCompleted: true }
    });
    expect(res2.currentState).toBe('ESTIMATION');

    // 3. ESTIMATION -> APPROVAL_PENDING
    const res3 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'APPROVAL_PENDING',
      actorId: 'usr_advisor_1',
      actorRole: 'service_advisor',
      reason: 'Estimate generated, sent to customer'
    });
    expect(res3.currentState).toBe('APPROVAL_PENDING');

    // 4. APPROVAL_PENDING -> WORK_IN_PROGRESS
    const res4 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'WORK_IN_PROGRESS',
      actorId: 'usr_supervisor_1',
      actorRole: 'floor_supervisor',
      reason: 'Customer approved estimate via SMS link',
      ruleData: { estimateApproved: true }
    });
    expect(res4.currentState).toBe('WORK_IN_PROGRESS');

    // 5. WORK_IN_PROGRESS -> QUALITY_CHECK
    const res5 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'QUALITY_CHECK',
      actorId: 'usr_supervisor_1',
      actorRole: 'floor_supervisor',
      reason: 'Repair work completed in Bay 3'
    });
    expect(res5.currentState).toBe('QUALITY_CHECK');

    // 6. QUALITY_CHECK -> READY_FOR_DELIVERY
    const res6 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'READY_FOR_DELIVERY',
      actorId: 'usr_qc_inspector_1',
      actorRole: 'qc_inspector',
      reason: 'Road test passed & QC checklist verified',
      ruleData: { qualityPassed: true }
    });
    expect(res6.currentState).toBe('READY_FOR_DELIVERY');

    // 7. READY_FOR_DELIVERY -> GATE_OUT
    const res7 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'GATE_OUT',
      actorId: 'usr_sec_agent',
      actorRole: 'security_agent',
      reason: 'Invoice settled & gate pass scanned',
      ruleData: { invoiceGenerated: true, paymentSettled: true }
    });
    expect(res7.currentState).toBe('GATE_OUT');
    expect(res7.stateCode).toBe('STATE_GATE_OUT');

    // 8. GATE_OUT -> CLOSED
    const res8 = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'CLOSED',
      actorId: 'usr_sec_agent',
      actorRole: 'security_agent',
      reason: 'Vehicle departed premise, session closed'
    });
    expect(res8.currentState).toBe('CLOSED');
  });

  it('2. Invalid Transition: Should reject invalid state jump', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB1002',
      chassisNumber: 'CHASSIS-1002-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await expect(
      vosStateEngine.transitionState({
        vosId: vos.id,
        targetState: 'READY_FOR_DELIVERY', // Invalid jump from GATE_IN
        actorId: 'usr_advisor_1',
        actorRole: 'service_advisor'
      })
    ).rejects.toThrow(VosStateException);
  });

  it('3. Duplicate Transition: Should reject transition to the same current state', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB1003',
      chassisNumber: 'CHASSIS-1003-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await expect(
      vosStateEngine.transitionState({
        vosId: vos.id,
        targetState: 'GATE_IN', // Already in GATE_IN
        actorId: 'usr_sec_agent',
        actorRole: 'security_agent'
      })
    ).rejects.toThrow(VosStateException);
  });

  it('4. Unauthorized Role: Should reject transition when actor role lacks permission', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB1004',
      chassisNumber: 'CHASSIS-1004-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await expect(
      vosStateEngine.transitionState({
        vosId: vos.id,
        targetState: 'INSPECTION',
        actorId: 'usr_cleaning_staff',
        actorRole: 'janitor' // Unauthorized role
      })
    ).rejects.toThrow(VosStateException);
  });

  it('5. Missing Prerequisite Rule: Should reject transition when prerequisite fails', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB1005',
      chassisNumber: 'CHASSIS-1005-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    // Move to ESTIMATION
    await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'ESTIMATION',
      actorId: 'usr_advisor_1',
      actorRole: 'service_advisor',
      ruleData: { inspectionCompleted: true }
    });

    // Try moving to WORK_IN_PROGRESS without estimate approval ruleData
    await expect(
      vosStateEngine.transitionState({
        vosId: vos.id,
        targetState: 'WORK_IN_PROGRESS',
        actorId: 'usr_advisor_1',
        actorRole: 'service_advisor',
        ruleData: { estimateApproved: false }
      })
    ).rejects.toThrow(VosStateException);
  });

  it('6. GM Override Success: Should bypass graph & rules when GM override authorized with reason', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB1006',
      chassisNumber: 'CHASSIS-1006-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    // GM Override jump from GATE_IN directly to WORK_IN_PROGRESS
    const res = await vosStateEngine.transitionState({
      vosId: vos.id,
      targetState: 'WORK_IN_PROGRESS',
      actorId: 'usr_general_manager',
      actorRole: 'general_manager',
      isGmOverride: true,
      gmOverrideJustification: 'Emergency breakdown VIP vehicle required immediate bay allocation'
    });

    expect(res.currentState).toBe('WORK_IN_PROGRESS');
    expect(res.historyRecord.transitionReason).toContain('[GM OVERRIDE]');
  });

  it('7. GM Override Guard: Should reject GM override if justification is missing', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB1007',
      chassisNumber: 'CHASSIS-1007-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await expect(
      vosStateEngine.transitionState({
        vosId: vos.id,
        targetState: 'WORK_IN_PROGRESS',
        actorId: 'usr_general_manager',
        actorRole: 'general_manager',
        isGmOverride: true
        // Missing gmOverrideJustification / reason
      })
    ).rejects.toThrow(VosStateException);
  });

  it('8. Closed Session Protection: Should reject transitions on closed VOS', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB1008',
      chassisNumber: 'CHASSIS-1008-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    // Close session directly via service
    await vosService.closeVos({
      vosId: vos.id,
      expectedVersion: 1,
      closedBy: 'usr_sec_agent'
    });

    await expect(
      vosStateEngine.transitionState({
        vosId: vos.id,
        targetState: 'INSPECTION',
        actorId: 'usr_advisor_1',
        actorRole: 'service_advisor'
      })
    ).rejects.toThrow(VosStateException);
  });
});
