/**
 * DWIP Enterprise WOS - VosAuditPolicy
 * Audit Policy Rules, No-Op Filtering & Actor Verification
 */

import { FieldChange } from './types';
import { VosAuditException } from './VosAuditException';

export class VosAuditPolicy {
  private static readonly IGNORED_AUDIT_FIELDS = ['updatedAt'];

  public static filterNoOps(diffs: FieldChange[]): FieldChange[] {
    return diffs.filter(d => {
      if (VosAuditPolicy.IGNORED_AUDIT_FIELDS.includes(d.fieldName)) {
        return false;
      }
      return d.previousValue !== d.newValue;
    });
  }

  public static validateActor(changedBy?: string, changedByRole?: string): void {
    if (!changedBy || changedBy.trim().length === 0) {
      throw new VosAuditException(
        'Audit recording failed: changedBy (actor ID) is required for audit traceability.',
        'VOS_AUDIT_MISSING_ACTOR'
      );
    }
  }
}
