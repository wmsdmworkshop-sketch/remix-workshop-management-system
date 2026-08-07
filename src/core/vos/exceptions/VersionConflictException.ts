/**
 * DWIP Enterprise WOS - VersionConflictException
 */

import { VosDomainException } from './VosDomainException';

export class VersionConflictException extends VosDomainException {
  constructor(vosId: string, expectedVersion: number, actualVersion: number, context?: Record<string, any>) {
    super(
      `Optimistic concurrency lock conflict for VOS ${vosId}: expected version ${expectedVersion}, found ${actualVersion}`,
      'VERSION_CONFLICT',
      { vosId, expectedVersion, actualVersion, ...context }
    );
  }
}
