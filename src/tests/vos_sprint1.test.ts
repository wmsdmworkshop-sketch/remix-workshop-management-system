/**
 * DWIP Enterprise - Sprint 1 VOS Foundation Test Suite
 * Vitest Unit & Integration Tests verifying all 13 Frozen Architecture Rules
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VosCorePlatform } from '../core/vos';

describe('DWIP Enterprise - Sprint 1 VOS Foundation Platform', () => {
  let testVin: string;
  let testReg: string;

  beforeEach(() => {
    testVin = `VIN_TEST_${Date.now()}`;
    testReg = `REG_${Math.floor(Math.random() * 8999 + 1000)}`;
  });

  it('Rule 1-4: Should create a Vehicle Operational Session (VOS) starting at Gate In', async () => {
    const session = await VosCorePlatform.vos.createSession(
      testVin,
      testReg,
      'usr_sec_agent',
      'security_agent'
    );

    expect(session.id).toBeDefined();
    expect(session.vin).toBe(testVin);
    expect(session.registrationNumber).toBe(testReg);
    expect(session.status).toBe('GATE_IN');
    expect(session.operationalReadiness).toBe(false);
    expect(session.hasOemJobCard).toBe(false);
    expect(session.hasApprovedDeviation).toBe(false);
  });

  it('Rule 5-6: Should require Operational Readiness before attaching an OEM Job Card', async () => {
    const session = await VosCorePlatform.vos.createSession(
      testVin,
      testReg,
      'usr_sec_agent',
      'security_agent'
    );

    // Attempt to attach OEM Job Card BEFORE operational readiness should throw error
    await expect(
      VosCorePlatform.vos.attachOemJobCard(session.id, 'JC-999', 'usr_sa_1', 'service_advisor')
    ).rejects.toThrow(/Operational Readiness must be achieved/);

    // Set Operational Readiness
    const updated = await VosCorePlatform.vos.setOperationalReadiness(session.id, 'usr_sa_1', 'service_advisor');
    expect(updated.operationalReadiness).toBe(true);

    // Now attach OEM Job Card should succeed
    const withJc = await VosCorePlatform.vos.attachOemJobCard(session.id, 'JC-999', 'usr_sa_1', 'service_advisor');
    expect(withJc.hasOemJobCard).toBe(true);
  });

  it('Rule 7: Job Card must NOT block workshop operations (OPERATIONAL_READY -> WORKSHOP_WIP allowed)', async () => {
    const session = await VosCorePlatform.vos.createSession(
      testVin,
      testReg,
      'usr_sec_agent',
      'security_agent'
    );

    await VosCorePlatform.state.transitionState(session, 'INTAKE_WIP', 'usr_sa_1', 'service_advisor');
    await VosCorePlatform.vos.setOperationalReadiness(session.id, 'usr_sa_1', 'service_advisor');

    // Progress to WORKSHOP_WIP even without OEM Job Card
    expect(session.hasOemJobCard).toBe(false);
    const inWip = await VosCorePlatform.state.transitionState(session, 'WORKSHOP_WIP', 'usr_supervisor', 'supervisor');
    expect(inWip.status).toBe('WORKSHOP_WIP');
  });

  it('Rule 8: Gate Out / VOS Closure MUST reject if neither OEM Job Card nor Approved Deviation exists', async () => {
    const session = await VosCorePlatform.vos.createSession(
      testVin,
      testReg,
      'usr_sec_agent',
      'security_agent'
    );

    await VosCorePlatform.state.transitionState(session, 'INTAKE_WIP', 'usr_sa_1', 'service_advisor');
    await VosCorePlatform.vos.setOperationalReadiness(session.id, 'usr_sa_1', 'service_advisor');
    await VosCorePlatform.state.transitionState(session, 'WORKSHOP_WIP', 'usr_tech', 'technician');
    await VosCorePlatform.state.transitionState(session, 'QC_PENDING', 'usr_qc', 'qc_inspector');
    await VosCorePlatform.state.transitionState(session, 'DELIVERY_READY', 'usr_sa_1', 'service_advisor');

    // Neither Job Card nor Approved Deviation attached
    await expect(
      VosCorePlatform.vos.gateOut(session.id, 'usr_sec_agent', 'security_agent')
    ).rejects.toThrow(/VOS Closure and Gate Out require either an OEM Job Card OR an Approved Deviation/);
  });

  it('Rule 8 & 13: Should permit Gate Out when an Approved Deviation exists (without Job Card)', async () => {
    const session = await VosCorePlatform.vos.createSession(
      testVin,
      testReg,
      'usr_sec_agent',
      'security_agent'
    );

    await VosCorePlatform.state.transitionState(session, 'INTAKE_WIP', 'usr_sa_1', 'service_advisor');
    await VosCorePlatform.vos.setOperationalReadiness(session.id, 'usr_sa_1', 'service_advisor');

    // Create & approve deviation
    const deviation = await VosCorePlatform.vos.requestDeviation(
      session.id,
      'BYPASS_JOB_CARD',
      'Emergency OEM server offline override',
      'usr_sa_1'
    );
    expect(deviation.status).toBe('PENDING');

    await VosCorePlatform.vos.approveDeviation(deviation.id, 'usr_gm_1');
    expect(session.hasApprovedDeviation).toBe(true);

    // Gate Out should now succeed
    const closed = await VosCorePlatform.vos.gateOut(session.id, 'usr_sec_agent', 'security_agent');
    expect(closed.status).toBe('GATE_OUT');
    expect(closed.gateOutTime).toBeDefined();
  });

  it('Rule 9 & 12: Every action creates an immutable event in the Event Engine', async () => {
    const session = await VosCorePlatform.vos.createSession(
      testVin,
      testReg,
      'usr_sec_agent',
      'security_agent'
    );

    const events = VosCorePlatform.events.getEventsForVos(session.id);
    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.eventType === 'VOS_CREATED_GATE_IN')).toBe(true);
  });

  it('Rule 10: Every state transition is audited in the Audit Engine', async () => {
    const session = await VosCorePlatform.vos.createSession(
      testVin,
      testReg,
      'usr_sec_agent',
      'security_agent'
    );

    await VosCorePlatform.state.transitionState(session, 'INTAKE_WIP', 'usr_sa_1', 'service_advisor', 'Vehicle inspection initiated');

    const transitions = VosCorePlatform.audit.getTransitionsForVos(session.id);
    expect(transitions.length).toBeGreaterThan(0);
    expect(transitions[0].toState).toBe('INTAKE_WIP');
    expect(transitions[0].actorRole).toBe('service_advisor');
  });

  it('Rule 11: Ownership Engine maintains custody handover chain', async () => {
    const session = await VosCorePlatform.vos.createSession(
      testVin,
      testReg,
      'usr_sec_agent',
      'security_agent'
    );

    await VosCorePlatform.ownership.transferOwnership({
      vosId: session.id,
      fromUserId: 'usr_sec_agent',
      toUserId: 'usr_sa_1',
      fromRole: 'security_agent',
      toRole: 'service_advisor',
      reason: 'Vehicle handover to Service Advisor'
    });

    const history = VosCorePlatform.ownership.getHistoryForVos(session.id);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].toUserId).toBe('usr_sa_1');
  });

  it('Dual Timeline Engine populates Operational & Financial Audit timelines', async () => {
    const session = await VosCorePlatform.vos.createSession(
      testVin,
      testReg,
      'usr_sec_agent',
      'security_agent'
    );

    const opNodes = VosCorePlatform.timeline.getTimelineForVos(session.id, 'OPERATIONAL');
    expect(opNodes.length).toBeGreaterThan(0);
  });
});
