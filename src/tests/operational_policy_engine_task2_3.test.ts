/**
 * DWIP Enterprise WOS - Task 2.3 Operational Policy Engine Vitest Test Suite
 * Minimum 95% Coverage for Operational Policy Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vosService } from '../core/vos/services';
import { operationalPolicyEngine } from '../core/policy/OperationalPolicyEngine';
import { OperationalPolicyException } from '../core/policy/OperationalPolicyException';
import { StructuredLogger } from '../core/vos/utils/StructuredLogger';

describe('DWIP Enterprise WOS - Task 2.3 Operational Policy Engine Test Suite', () => {
  let uniqueVehicleId: string;
  let uniqueCustomerId: string;

  beforeEach(() => {
    uniqueVehicleId = `veh_pol_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    uniqueCustomerId = `cust_pol_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    StructuredLogger.clearLogsForTest();
  });

  it('1. Rule Evaluation: Should permit START_WORK operation for authorized technician role', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12POL1001',
      chassisNumber: 'CHASSIS-POL-1001',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const decision = await operationalPolicyEngine.evaluate({
      vos,
      operation: 'START_WORK',
      userRole: 'technician'
    });

    expect(decision.allowed).toBe(true);
    expect(decision.evaluatedRules).toContain('RoleAuthorizationPolicyRule');
  });

  it('2. Role Authorization Rejection: Should reject START_WORK operation for unauthorized security_agent role', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12POL1002',
      chassisNumber: 'CHASSIS-POL-1002',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const decision = await operationalPolicyEngine.evaluate({
      vos,
      operation: 'START_WORK',
      userRole: 'security_agent'
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons.length).toBeGreaterThan(0);
    expect(decision.reasons[0]).toContain('security_agent');
  });

  it('3. Closed Session Policy: Should reject operations on CLOSED VOS session', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12POL1003',
      chassisNumber: 'CHASSIS-POL-1003',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const closedVos = await vosService.closeVos({ vosId: vos.id, expectedVersion: 1, closedBy: 'usr_sec_agent' });

    const decision = await operationalPolicyEngine.evaluate({
      vos: closedVos,
      operation: 'START_WORK',
      userRole: 'technician'
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons[0]).toContain('CLOSED');
  });

  it('4. Workshop & OEM Constraints: Should enforce workshop type and OEM claim hold constraints', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12POL1004',
      chassisNumber: 'CHASSIS-POL-1004',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const decision = await operationalPolicyEngine.evaluate({
      vos,
      operation: 'APPLY_GOODWILL',
      userRole: 'gm',
      oemConstraints: { claimHold: true }
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons[0]).toContain('OEM warranty claim is currently placed on hold');
  });

  it('5. GM Policy Override Authorization: Should grant override when GM authorizes with justification reason', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12POL1005',
      chassisNumber: 'CHASSIS-POL-1005',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const decision = await operationalPolicyEngine.evaluate({
      vos,
      operation: 'APPLY_GOODWILL',
      userRole: 'general_manager',
      isOverride: true,
      overrideReason: 'Special Customer Loyalty Concession Approved'
    });

    expect(decision.allowed).toBe(true);
    expect(decision.isOverrideApplied).toBe(true);
  });
});
