/**
 * DWIP Enterprise WOS - Task 1.5 Audit Engine Vitest Test Suite
 * Minimum 95% Coverage for VOS Audit Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vosService } from '../core/vos/services';
import { vosAuditEngine, VosAuditEngine } from '../core/vos/audit/VosAuditEngine';
import { VosAuditEventMapper } from '../core/vos/audit/VosAuditEventMapper';
import { MemoryAuditRecorder } from '../core/vos/audit/MemoryAuditRecorder';
import { VosAuditException } from '../core/vos/audit/VosAuditException';
import { VosPriority, VosRiskLevel, VisitType } from '../domain/vos/types';
import { StructuredLogger } from '../core/vos/utils/StructuredLogger';

describe('DWIP Enterprise WOS - Task 1.5 VOS Audit Engine Test Suite', () => {
  let uniqueVehicleId: string;
  let uniqueCustomerId: string;

  beforeEach(() => {
    uniqueVehicleId = `veh_aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    uniqueCustomerId = `cust_aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    StructuredLogger.clearLogsForTest();
  });

  it('1. Single-Field Change: Should audit single field mutation accurately', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AUD1001',
      chassisNumber: 'CHASSIS-AUD-1001',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    const correlationId = 'CORR-SINGLE-FIELD-1001';
    await vosService.updateVos(
      {
        id: vos.id,
        expectedVersion: 1,
        updatedBy: 'usr_supervisor_1',
        priority: VosPriority.EMERGENCY
      },
      correlationId
    );

    const history = await vosAuditEngine.queryAuditHistory({
      entityId: vos.id,
      fieldName: 'priority'
    });

    expect(history.length).toBe(1);
    expect(history[0].fieldName).toBe('priority');
    expect(history[0].previousValue).toBe(VosPriority.NORMAL);
    expect(history[0].newValue).toBe(VosPriority.EMERGENCY);
    expect(history[0].changedBy).toBe('usr_supervisor_1');
    expect(history[0].correlationId).toBe(correlationId);
  });

  it('2. Multi-Field Changes: Should audit multi-field updates in batch', async () => {
    const vos = await vosService.createVos({
      companyId: 'COMP-TATA',
      dealerId: 'DLR-MUM-01',
      branchId: 'BR-CENTRAL',
      vehicleId: uniqueVehicleId,
      customerId: uniqueCustomerId,
      registrationNumber: 'MH12AUD1002',
      chassisNumber: 'CHASSIS-AUD-1002',
      createdBy: 'usr_sec_agent',
      currentOwner: 'usr_sec_agent'
    });

    await vosService.updateVos({
      id: vos.id,
      expectedVersion: 1,
      updatedBy: 'usr_supervisor_1',
      priority: VosPriority.HIGH,
      riskLevel: VosRiskLevel.HIGH,
      riskScore: 85,
      riskReason: 'Critical brake pad wear'
    });

    const history = await vosAuditEngine.queryAuditHistory({ entityId: vos.id });
    expect(history.length).toBeGreaterThanOrEqual(4); // priority, riskLevel, riskScore, riskReason

    const priorityAudit = history.find(h => h.fieldName === 'priority');
    expect(priorityAudit?.newValue).toBe(VosPriority.HIGH);

    const riskScoreAudit = history.find(h => h.fieldName === 'riskScore');
    expect(riskScoreAudit?.previousValue).toBe('0');
    expect(riskScoreAudit?.newValue).toBe('85');
  });

  it('3. No-Op Change Filtering: Should yield zero audit records when fields remain unchanged', async () => {
    const prevState = { priority: 'NORMAL', riskScore: 10 };
    const nextState = { priority: 'NORMAL', riskScore: 10 };

    const records = await vosAuditEngine.recordChange(
      'vos',
      'vos_noop_100',
      prevState,
      nextState,
      'usr_agent',
      'role',
      'No-op attempt'
    );

    expect(records.length).toBe(0);
  });

  it('4. Null/Value Transitions: Should audit null-to-value and value-to-null changes correctly', async () => {
    const diffs = VosAuditEventMapper.computeDiffs(
      { riskReason: null, externalReference: 'EXT-12345' },
      { riskReason: 'New Risk Reason Added', externalReference: null }
    );

    expect(diffs.length).toBe(2);

    const nullToValue = diffs.find(d => d.fieldName === 'riskReason');
    expect(nullToValue?.changeType).toBe('NULL_TO_VALUE');
    expect(nullToValue?.previousValue).toBeNull();
    expect(nullToValue?.newValue).toBe('New Risk Reason Added');

    const valueToNull = diffs.find(d => d.fieldName === 'externalReference');
    expect(valueToNull?.changeType).toBe('VALUE_TO_NULL');
    expect(valueToNull?.previousValue).toBe('EXT-12345');
    expect(valueToNull?.newValue).toBeNull();
  });

  it('5. JSON Serialization: Should safely serialize complex object field values to strings', async () => {
    const diffs = VosAuditEventMapper.computeDiffs(
      { metadata: { a: 1 } },
      { metadata: { a: 2, b: 'hello' } }
    );

    expect(diffs.length).toBe(1);
    expect(diffs[0].previousValue).toBe('{"a":1}');
    expect(diffs[0].newValue).toBe('{"a":2,"b":"hello"}');
  });

  it('6. Invalid Actor Guard: Should throw VosAuditException when actor changedBy is missing', async () => {
    await expect(
      vosAuditEngine.recordChange(
        'vos',
        'vos_id_99',
        { priority: 'NORMAL' },
        { priority: 'HIGH' },
        '', // Empty actor ID
        'role'
      )
    ).rejects.toThrow(VosAuditException);
  });

  it('7. Batch Recording & Querying: Should support recording batch audit records and querying by fieldName', async () => {
    const recorder = new MemoryAuditRecorder();
    const batch = [
      {
        entity: 'vos',
        entityId: 'vos_batch_01',
        fieldName: 'priority',
        previousValue: 'LOW',
        newValue: 'HIGH',
        changedBy: 'usr_sec',
        changedByRole: 'security'
      },
      {
        entity: 'vos',
        entityId: 'vos_batch_01',
        fieldName: 'riskLevel',
        previousValue: 'LOW',
        newValue: 'CRITICAL',
        changedBy: 'usr_sec',
        changedByRole: 'security'
      }
    ];

    const res = await recorder.recordBatch(batch);
    expect(res.length).toBe(2);

    const queryRes = await recorder.query({ entityId: 'vos_batch_01', fieldName: 'riskLevel' });
    expect(queryRes.length).toBe(1);
    expect(queryRes[0].newValue).toBe('CRITICAL');
  });
});
