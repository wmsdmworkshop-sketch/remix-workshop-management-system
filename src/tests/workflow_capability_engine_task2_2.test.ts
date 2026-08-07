/**
 * DWIP Enterprise WOS - Task 2.2 Workflow Capability Engine Vitest Test Suite
 * Minimum 95% Coverage for Workflow Capability Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vosService } from '../core/vos/services';
import { workflowCapabilityEngine } from '../core/workflow/capabilities/WorkflowCapabilityEngine';
import { WorkflowCapability } from '../core/workflow/WorkflowCapability';
import { WorkflowCapabilityException } from '../core/workflow/capabilities/WorkflowCapabilityException';
import { VisitType } from '../domain/vos/types';
import { StructuredLogger } from '../core/vos/utils/StructuredLogger';

describe('DWIP Enterprise WOS - Task 2.2 Workflow Capability Engine Test Suite', () => {
  let uniqueVehicleId: string;
  let uniqueCustomerId: string;

  beforeEach(() => {
    uniqueVehicleId = `veh_cap_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    uniqueCustomerId = `cust_cap_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    workflowCapabilityEngine.clearCache();
    StructuredLogger.clearLogsForTest();
  });

  it('1. Capability Resolution: Should resolve active capabilities for breakdown VOS', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12CAP1001',
      chassisNumber: 'CHASSIS-CAP-1001',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent',
      visitType: VisitType.BREAKDOWN,
      isBreakdown: true
    });

    const hasFastTrack = workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.FAST_TRACK);
    expect(hasFastTrack).toBe(true);

    const hasQrt = workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.QRT_DISPATCH);
    expect(hasQrt).toBe(true);
  });

  it('2. Capability Rejection: Should return false for capabilities not present in profile', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12CAP1002',
      chassisNumber: 'CHASSIS-CAP-1002',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    // Standard service does not have FAST_TRACK capability
    const hasFastTrack = workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.FAST_TRACK);
    expect(hasFastTrack).toBe(false);
  });

  it('3. Capability Override: Should grant capability when authorized GM override is provided', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12CAP1003',
      chassisNumber: 'CHASSIS-CAP-1003',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const hasFastTrackWithOverride = workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.FAST_TRACK, {
      actorRole: 'general_manager',
      isOverride: true,
      overrideReason: 'VIP Fleet Customer Emergency Repair'
    });

    expect(hasFastTrackWithOverride).toBe(true);
  });

  it('4. Unknown Capability Guard: Should throw WorkflowCapabilityException for unregistered capability', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12CAP1004',
      chassisNumber: 'CHASSIS-CAP-1004',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    expect(() =>
      workflowCapabilityEngine.hasCapability(vos, 'NON_EXISTENT_CAPABILITY' as WorkflowCapability)
    ).toThrow(WorkflowCapabilityException);
  });

  it('5. Caching & Cache Invalidation: Should retrieve cached capability evaluation and support cache clearance', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12CAP1005',
      chassisNumber: 'CHASSIS-CAP-1005',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent',
      visitType: VisitType.BREAKDOWN,
      isBreakdown: true
    });

    // 1st Call (populates cache)
    const cap1 = workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.FAST_TRACK);
    expect(cap1).toBe(true);

    // 2nd Call (hits cache)
    const cap2 = workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.FAST_TRACK);
    expect(cap2).toBe(true);

    // Invalidate cache
    workflowCapabilityEngine.invalidateVosCache(vos.id);
    const cap3 = workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.FAST_TRACK);
    expect(cap3).toBe(true);
  });
});
