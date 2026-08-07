/**
 * DWIP Enterprise WOS - VosValidationService
 * Task 1.2 Structural & Business Validation Service
 */

import {
  IVos,
  VisitType,
  CommercialType,
  EntrySource,
  VosPriority,
  VosRiskLevel,
  DataClassification
} from '../../../domain/vos/types';
import {
  ValidationException,
  ImmutableFieldException,
  VosAlreadyClosedException,
  DuplicateActiveVosException,
  VersionConflictException
} from '../exceptions';
import { VosPolicies } from '../utils/VosPolicies';
import { VOS_CONSTANTS } from '../utils/VosConstants';
import { IVosRepository } from '../../../domain/vos/repositories';

export class VosValidationService {
  /**
   * 1. Structural Validation: Format, Enums, UUIDs, Risk Score Range
   */
  public validateStructural(vosData: Partial<IVos>): void {
    if (vosData.riskScore !== undefined) {
      if (
        typeof vosData.riskScore !== 'number' ||
        vosData.riskScore < VOS_CONSTANTS.MIN_RISK_SCORE ||
        vosData.riskScore > VOS_CONSTANTS.MAX_RISK_SCORE
      ) {
        throw new ValidationException(
          `Invalid riskScore: ${vosData.riskScore}. Must be an integer between ${VOS_CONSTANTS.MIN_RISK_SCORE} and ${VOS_CONSTANTS.MAX_RISK_SCORE}`
        );
      }
    }

    if (vosData.visitType && !Object.values(VisitType).includes(vosData.visitType as VisitType)) {
      throw new ValidationException(`Invalid visitType enum value: ${vosData.visitType}`);
    }

    if (vosData.commercialType && !Object.values(CommercialType).includes(vosData.commercialType as CommercialType)) {
      throw new ValidationException(`Invalid commercialType enum value: ${vosData.commercialType}`);
    }

    if (vosData.entrySource && !Object.values(EntrySource).includes(vosData.entrySource as EntrySource)) {
      throw new ValidationException(`Invalid entrySource enum value: ${vosData.entrySource}`);
    }

    if (vosData.priority && !Object.values(VosPriority).includes(vosData.priority as VosPriority)) {
      throw new ValidationException(`Invalid priority enum value: ${vosData.priority}`);
    }

    if (vosData.riskLevel && !Object.values(VosRiskLevel).includes(vosData.riskLevel as VosRiskLevel)) {
      throw new ValidationException(`Invalid riskLevel enum value: ${vosData.riskLevel}`);
    }

    if (vosData.dataClassification && !Object.values(DataClassification).includes(vosData.dataClassification as DataClassification)) {
      throw new ValidationException(`Invalid dataClassification enum value: ${vosData.dataClassification}`);
    }
  }

  /**
   * 2. Business Validation: Immutable Field Protection
   */
  public validateImmutableProtection(updateKeys: string[]): void {
    const violations = VosPolicies.findImmutableViolations(updateKeys);
    if (violations.length > 0) {
      throw new ImmutableFieldException(violations);
    }
  }

  /**
   * 3. Business Validation: Allow-List Mutation Guard
   */
  public validateAllowListMutations(updateKeys: string[]): void {
    const unallowed = VosPolicies.findUnallowedMutations(updateKeys);
    if (unallowed.length > 0) {
      throw new ValidationException(
        `Field(s) '${unallowed.join(', ')}' are not in the mutation allow-list. Only priority, riskLevel, riskScore, riskReason, operationalStatus, currentOwner, and updatedBy can be updated.`
      );
    }
  }

  /**
   * 4. Business Validation: Closed VOS Read-Only Guard
   */
  public validateClosedSession(vos: IVos): void {
    if (vos.isClosed) {
      throw new VosAlreadyClosedException(vos.id);
    }
  }

  /**
   * 5. Business Validation: Duplicate Active VOS Prevention
   */
  public async validateDuplicateActiveVos(vehicleId: string, repository: IVosRepository): Promise<void> {
    const active = await repository.findActiveByVehicleId(vehicleId);
    if (active) {
      throw new DuplicateActiveVosException(vehicleId, active.id);
    }
  }

  /**
   * 6. Business Validation: Optimistic Locking Version Guard
   */
  public validateOptimisticLock(existing: IVos, expectedVersion: number): void {
    if (existing.version !== expectedVersion) {
      throw new VersionConflictException(existing.id, expectedVersion, existing.version);
    }
  }
}

export const vosValidationService = new VosValidationService();
