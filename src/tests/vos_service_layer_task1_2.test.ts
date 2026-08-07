/**
 * DWIP Enterprise WOS - Task 1.2 VOS Service Layer Vitest Test Suite
 * Minimum 95% Service Layer Test Coverage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vosService, VosService } from '../core/vos/services';
import {
  ImmutableFieldException,
  VersionConflictException,
  ValidationException,
  VosAlreadyClosedException,
  DuplicateActiveVosException,
  VosNotFoundException
} from '../core/vos/exceptions';
import {
  VisitType,
  CommercialType,
  EntrySource,
  VosPriority,
  VosRiskLevel
} from '../domain/vos/types';
import { StructuredLogger } from '../core/vos/utils/StructuredLogger';
import { VosNumberGenerator } from '../core/vos/utils/VosNumberGenerator';

describe('DWIP Enterprise WOS - Task 1.2 VOS Service Layer Test Suite', () => {
  let uniqueVehicleId: string;
  let uniqueCustomerId: string;

  beforeEach(() => {
    uniqueVehicleId = `veh_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    uniqueCustomerId = `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    StructuredLogger.clearLogsForTest();
  });

  it('1. Happy Path: Should create VOS session with generated VOS Number', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB9999',
      chassisNumber: 'CHASSIS-9999-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent',
      visitType: VisitType.NORMAL_SERVICE,
      commercialType: CommercialType.CUSTOMER_PAY,
      entrySource: EntrySource.ANPR
    });

    expect(vos.id).toBeDefined();
    expect(vos.publicId).toBeDefined();
    expect(vos.vosNumber).toMatch(/DLRMUM01-BRCENTRAL-2026-\d{6}/);
    expect(vos.version).toBe(1);
    expect(vos.isClosed).toBe(false);
    expect(vos.currentState).toBe('GATE_IN');
  });

  it('2. VOS Retrieval: Should retrieve VOS by ID, Public ID, and VOS Number', async () => {
    const created = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB8888',
      chassisNumber: 'CHASSIS-8888-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const byId = await vosService.query.getById(created.id);
    expect(byId.id).toBe(created.id);

    const byPublicId = await vosService.query.getByPublicId(created.publicId);
    expect(byPublicId.id).toBe(created.id);

    const byVosNumber = await vosService.query.getByVosNumber(created.vosNumber);
    expect(byVosNumber.id).toBe(created.id);
  });

  it('3. Allow-List Mutation: Should update permitted mutable fields and increment version', async () => {
    const created = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB7777',
      chassisNumber: 'CHASSIS-7777-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const updated = await vosService.updateVos({
      id: created.id,
      expectedVersion: 1,
      updatedBy: 'usr_supervisor_1',
      priority: VosPriority.HIGH,
      riskLevel: VosRiskLevel.MEDIUM,
      riskScore: 65,
      riskReason: 'Delayed parts arrival',
      operationalStatus: 'IN_DIAGNOSTIC'
    });

    expect(updated.version).toBe(2);
    expect(updated.priority).toBe(VosPriority.HIGH);
    expect(updated.riskLevel).toBe(VosRiskLevel.MEDIUM);
    expect(updated.riskScore).toBe(65);
    expect(updated.riskReason).toBe('Delayed parts arrival');
    expect(updated.operationalStatus).toBe('IN_DIAGNOSTIC');
  });

  it('4. Immutable Field Guard: Should throw ImmutableFieldException when modifying intake fields', async () => {
    const created = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB6666',
      chassisNumber: 'CHASSIS-6666-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await expect(
      vosService.updateVos({
        id: created.id,
        expectedVersion: 1,
        updatedBy: 'usr_attacker',
        registrationNumber: 'MH12HACKED'
      })
    ).rejects.toThrow(ImmutableFieldException);
  });

  it('5. Allow-List Guard: Should throw ValidationException when updating fields outside allow-list', async () => {
    const created = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB5555',
      chassisNumber: 'CHASSIS-5555-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await expect(
      vosService.updateVos({
        id: created.id,
        expectedVersion: 1,
        updatedBy: 'usr_user',
        currentStateCode: 'HACKED_STATE'
      })
    ).rejects.toThrow(ValidationException);
  });

  it('6. Duplicate Active VOS Guard: Should throw DuplicateActiveVosException for duplicate vehicle open VOS', async () => {
    await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB4444',
      chassisNumber: 'CHASSIS-4444-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await expect(
      vosService.createVos({
        companyId: 'COMP-TATA',
        dealerId: 'DLR-MUM-01',
        branchId: 'BR-CENTRAL',
        vehicleId: uniqueVehicleId,
        customerId: uniqueCustomerId,
        registrationNumber: 'MH12AB4444',
        chassisNumber: 'CHASSIS-4444-XYZ',
        createdBy: 'usr_sec_agent',
        currentOwner: 'usr_sec_agent'
      })
    ).rejects.toThrow(DuplicateActiveVosException);
  });

  it('7. Optimistic Locking Guard: Should throw VersionConflictException on version mismatch', async () => {
    const created = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB3333',
      chassisNumber: 'CHASSIS-3333-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await expect(
      vosService.updateVos({
        id: created.id,
        expectedVersion: 99, // Wrong version
        updatedBy: 'usr_user',
        priority: VosPriority.HIGH
      })
    ).rejects.toThrow(VersionConflictException);
  });

  it('8. Closed Session Guard: Should close VOS and reject subsequent mutations', async () => {
    const created = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB2222',
      chassisNumber: 'CHASSIS-2222-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const closed = await vosService.closeVos({
      vosId: created.id,
      expectedVersion: 1,
      closedBy: 'usr_sec_agent'
    });

    expect(closed.isClosed).toBe(true);
    expect(closed.closedAt).toBeDefined();

    // Re-closing must throw VosAlreadyClosedException
    await expect(
      vosService.closeVos({
        vosId: created.id,
        expectedVersion: 2,
        closedBy: 'usr_sec_agent'
      })
    ).rejects.toThrow(VosAlreadyClosedException);

    // Mutating closed VOS must throw VosAlreadyClosedException
    await expect(
      vosService.updateVos({
        id: created.id,
        expectedVersion: 2,
        updatedBy: 'usr_user',
        priority: VosPriority.HIGH
      })
    ).rejects.toThrow(VosAlreadyClosedException);
  });

  it('9. Structural Validation Guard: Should throw ValidationException on invalid risk score', async () => {
    const created = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB1111',
      chassisNumber: 'CHASSIS-1111-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await expect(
      vosService.updateVos({
        id: created.id,
        expectedVersion: 1,
        updatedBy: 'usr_user',
        riskScore: 150 // Out of range 0-100
      })
    ).rejects.toThrow(ValidationException);
  });

  it('10. Structured Logger & Transaction: Should log structured JSON events on actions', async () => {
    await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AB0000',
      chassisNumber: 'CHASSIS-0000-XYZ',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const logs = StructuredLogger.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some(l => l.operation === 'createVos' && l.result === 'SUCCESS')).toBe(true);
  });
});
