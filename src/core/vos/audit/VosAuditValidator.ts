/**
 * DWIP Enterprise WOS - VosAuditValidator
 * Validates Audit Events & Actor Identity Credentials
 */

import { FieldChange } from './types';
import { VosAuditPolicy } from './VosAuditPolicy';
import { VosAuditException } from './VosAuditException';

export class VosAuditValidator {
  public validate(
    entity: string,
    entityId: string,
    changedBy: string,
    changedByRole: string,
    diffs: FieldChange[]
  ): void {
    if (!entity || entity.trim().length === 0) {
      throw new VosAuditException('Audit recording failed: entity name is required', 'VOS_AUDIT_MISSING_ENTITY');
    }

    if (!entityId || entityId.trim().length === 0) {
      throw new VosAuditException('Audit recording failed: entityId is required', 'VOS_AUDIT_MISSING_ENTITY_ID');
    }

    VosAuditPolicy.validateActor(changedBy, changedByRole);
  }
}

export const vosAuditValidator = new VosAuditValidator();
