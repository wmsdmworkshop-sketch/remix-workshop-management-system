/**
 * DWIP Enterprise - VOS Primary Engine (Module 1)
 * Sprint 1 Architecture - Primary VOS Entity Manager
 * 
 * Manages Vehicle Operational Session lifecycle, deviations, and milestone attachments.
 */

import { VosSession, VosDeviation } from './types';
import { vosStateEngine } from './VosStateEngine';
import { vosEventEngine } from './VosEventEngine';
import { vosOwnershipEngine } from './VosOwnershipEngine';
import { vosTimelineEngine } from './VosTimelineEngine';
import { vosAuditEngine } from './VosAuditEngine';

export class VosEngine {
  private static instance: VosEngine;
  private sessions: Map<string, VosSession> = new Map();
  private deviations: Map<string, VosDeviation> = new Map();

  private constructor() {
    this.seedBaselineSessions();
  }

  public static getInstance(): VosEngine {
    if (!VosEngine.instance) {
      VosEngine.instance = new VosEngine();
    }
    return VosEngine.instance;
  }

  private seedBaselineSessions(): void {
    const now = new Date().toISOString();
    const s1: VosSession = {
      id: 'vos_1001',
      vin: 'MH12AB12345678901',
      registrationNumber: 'MH12AB1234',
      status: 'GATE_IN',
      gateInTime: now,
      operationalReadiness: false,
      hasOemJobCard: false,
      hasApprovedDeviation: false,
      currentOwnerId: 'usr_sec_1',
      currentOwnerRole: 'security_agent',
      createdAt: now,
      updatedAt: now
    };
    this.sessions.set(s1.id, s1);
  }

  /**
   * 1. Gate In: Creates a new immutable Vehicle Operational Session
   */
  public async createSession(
    vin: string,
    registrationNumber: string,
    creatorId: string,
    creatorRole: string
  ): Promise<VosSession> {
    if (!vin || !registrationNumber) {
      throw new Error('[VosEngine] VIN and Registration Number are mandatory for Gate In');
    }

    const now = new Date().toISOString();
    const session: VosSession = {
      id: `vos_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      vin,
      registrationNumber,
      status: 'GATE_IN',
      gateInTime: now,
      operationalReadiness: false,
      hasOemJobCard: false,
      hasApprovedDeviation: false,
      currentOwnerId: creatorId,
      currentOwnerRole: creatorRole,
      createdAt: now,
      updatedAt: now
    };

    this.sessions.set(session.id, session);

    // Initial Event & Ownership
    await vosEventEngine.emitEvent({
      vosId: session.id,
      eventType: 'VOS_CREATED_GATE_IN',
      payload: { vin, registrationNumber },
      actorId: creatorId,
      actorRole: creatorRole,
      correlationId: `corr_init_${session.id}`
    });

    await vosOwnershipEngine.transferOwnership({
      vosId: session.id,
      fromUserId: 'SYSTEM',
      toUserId: creatorId,
      fromRole: 'SYSTEM',
      toRole: creatorRole,
      reason: 'VOS initialized at Gate In'
    });

    await vosTimelineEngine.addNode({
      vosId: session.id,
      timelineType: 'OPERATIONAL',
      eventType: 'GATE_IN',
      title: `Vehicle Intake Gate In (${registrationNumber})`,
      metadata: { vin, creatorId }
    });

    return session;
  }

  /**
   * 2. Set Operational Readiness
   * Business rule: CRM / OEM Job Card creation occurs ONLY after Operational Readiness.
   */
  public async setOperationalReadiness(
    vosId: string,
    actorId: string,
    actorRole: string
  ): Promise<VosSession> {
    const session = this.getSession(vosId);
    session.operationalReadiness = true;
    session.updatedAt = new Date().toISOString();

    if (session.status === 'INTAKE_WIP') {
      await vosStateEngine.transitionState(
        session,
        'OPERATIONAL_READY',
        actorId,
        actorRole,
        'Operational readiness inspection completed'
      );
    }

    await vosEventEngine.emitEvent({
      vosId: session.id,
      eventType: 'VOS_OPERATIONAL_READINESS_SET',
      payload: { operationalReadiness: true },
      actorId,
      actorRole,
      correlationId: `corr_opread_${Date.now()}`
    });

    return session;
  }

  /**
   * 3. Attach OEM Job Card Business Milestone
   */
  public async attachOemJobCard(
    vosId: string,
    jobCardNumber: string,
    actorId: string,
    actorRole: string
  ): Promise<VosSession> {
    const session = this.getSession(vosId);

    if (!session.operationalReadiness) {
      throw new Error('[VosEngine] Operational Readiness must be achieved before attaching an OEM Job Card');
    }

    session.hasOemJobCard = true;
    session.updatedAt = new Date().toISOString();

    await vosEventEngine.emitEvent({
      vosId: session.id,
      eventType: 'VOS_OEM_JOB_CARD_ATTACHED',
      payload: { jobCardNumber },
      actorId,
      actorRole,
      correlationId: `corr_jc_${Date.now()}`
    });

    await vosTimelineEngine.addNode({
      vosId: session.id,
      timelineType: 'OPERATIONAL',
      eventType: 'OEM_JOB_CARD_ATTACHED',
      title: `OEM Job Card Attached: ${jobCardNumber}`,
      metadata: { jobCardNumber, actorId }
    });

    return session;
  }

  /**
   * 4. Request Exception Deviation
   * Business rule: Every exception must create a Deviation record.
   */
  public async requestDeviation(
    vosId: string,
    deviationType: VosDeviation['deviationType'],
    reason: string,
    requestedBy: string
  ): Promise<VosDeviation> {
    const session = this.getSession(vosId);

    const deviation: VosDeviation = {
      id: `dev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      vosId: session.id,
      deviationType,
      reason,
      requestedBy,
      status: 'PENDING',
      requestedAt: new Date().toISOString()
    };

    this.deviations.set(deviation.id, deviation);

    await vosEventEngine.emitEvent({
      vosId: session.id,
      eventType: 'VOS_DEVIATION_REQUESTED',
      payload: { deviationId: deviation.id, deviationType, reason },
      actorId: requestedBy,
      actorRole: 'requester',
      correlationId: `corr_dev_${deviation.id}`
    });

    return deviation;
  }

  /**
   * 5. Approve Exception Deviation
   */
  public async approveDeviation(
    deviationId: string,
    approvedBy: string
  ): Promise<VosDeviation> {
    const deviation = this.deviations.get(deviationId);
    if (!deviation) {
      throw new Error(`[VosEngine] Deviation ${deviationId} not found`);
    }

    deviation.status = 'APPROVED';
    deviation.approvedBy = approvedBy;
    deviation.resolvedAt = new Date().toISOString();

    const session = this.getSession(deviation.vosId);
    session.hasApprovedDeviation = true;
    session.updatedAt = new Date().toISOString();

    await vosEventEngine.emitEvent({
      vosId: session.id,
      eventType: 'VOS_DEVIATION_APPROVED',
      payload: { deviationId: deviation.id, approvedBy },
      actorId: approvedBy,
      actorRole: 'approver',
      correlationId: `corr_dev_appr_${deviation.id}`
    });

    await vosTimelineEngine.addNode({
      vosId: session.id,
      timelineType: 'FINANCIAL_AUDIT',
      eventType: 'DEVIATION_APPROVED',
      title: `Exception Approved: ${deviation.deviationType}`,
      metadata: { deviationId: deviation.id, approvedBy, reason: deviation.reason }
    });

    return deviation;
  }

  /**
   * 6. Gate Out / Close VOS
   * Business rule: Gate Out requires (OEM Job Card OR Approved Deviation).
   */
  public async gateOut(
    vosId: string,
    actorId: string,
    actorRole: string
  ): Promise<VosSession> {
    const session = this.getSession(vosId);

    // Auto-progress workflow through states up to DELIVERY_READY if needed
    if (session.status === 'GATE_IN') {
      await vosStateEngine.transitionState(session, 'INTAKE_WIP', actorId, actorRole, 'Auto intake for gate out');
    }
    if (session.status === 'INTAKE_WIP') {
      await this.setOperationalReadiness(session.id, actorId, actorRole);
    }
    if (session.status === 'OPERATIONAL_READY') {
      await vosStateEngine.transitionState(session, 'WORKSHOP_WIP', actorId, actorRole, 'Auto workshop WIP for gate out');
    }
    if (session.status === 'WORKSHOP_WIP') {
      await vosStateEngine.transitionState(session, 'QC_PENDING', actorId, actorRole, 'Auto QC step for Gate Out');
    }
    if (session.status === 'QC_PENDING') {
      await vosStateEngine.transitionState(session, 'DELIVERY_READY', actorId, actorRole, 'Delivery ready for Gate Out');
    }

    // State engine enforces (OEM Job Card OR Approved Deviation) guard rule
    await vosStateEngine.transitionState(session, 'GATE_OUT', actorId, actorRole, 'Vehicle Gate Out execution');

    return session;
  }

  public getSession(vosId: string): VosSession {
    const s = this.sessions.get(vosId);
    if (!s) {
      throw new Error(`[VosEngine] VOS Session ${vosId} not found`);
    }
    return s;
  }

  public getAllSessions(): VosSession[] {
    return Array.from(this.sessions.values());
  }

  public getDeviationsForVos(vosId: string): VosDeviation[] {
    return Array.from(this.deviations.values()).filter(d => d.vosId === vosId);
  }
}

export const vosEngine = VosEngine.getInstance();
