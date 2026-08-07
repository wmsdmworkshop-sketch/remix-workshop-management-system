/**
 * DWIP Enterprise WOS - VosAuditEventMapper
 * Field-Level Diff Extractor with Null/Value Transition & JSON Serialization
 */

import { FieldChange } from './types';

export class VosAuditEventMapper {
  private static serializeValue(val: any): string | null {
    if (val === undefined || val === null) {
      return null;
    }
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  public static computeDiffs(
    previousState: Record<string, any>,
    updatedState: Record<string, any>
  ): FieldChange[] {
    const diffs: FieldChange[] = [];
    const keys = new Set([...Object.keys(previousState || {}), ...Object.keys(updatedState || {})]);

    for (const key of keys) {
      const prevRaw = previousState ? previousState[key] : undefined;
      const nextRaw = updatedState ? updatedState[key] : undefined;

      const prevStr = VosAuditEventMapper.serializeValue(prevRaw);
      const nextStr = VosAuditEventMapper.serializeValue(nextRaw);

      // Skip identical values (No-Op change filtering)
      if (prevStr === nextStr) {
        continue;
      }

      let changeType: FieldChange['changeType'] = 'VALUE_UPDATED';
      if (prevStr === null && nextStr !== null) {
        changeType = 'NULL_TO_VALUE';
      } else if (prevStr !== null && nextStr === null) {
        changeType = 'VALUE_TO_NULL';
      }

      diffs.push({
        fieldName: key,
        previousValue: prevStr,
        newValue: nextStr,
        changeType
      });
    }

    return diffs;
  }
}
