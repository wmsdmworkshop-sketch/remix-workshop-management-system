/**
 * DWIP Enterprise WOS - DuplicateActiveVosException
 */

import { VosDomainException } from './VosDomainException';

export class DuplicateActiveVosException extends VosDomainException {
  constructor(vehicleId: string, existingVosId: string, context?: Record<string, any>) {
    super(
      `Vehicle ${vehicleId} already has an active open VOS (${existingVosId}). Cannot create a duplicate active VOS.`,
      'DUPLICATE_ACTIVE_VOS',
      { vehicleId, existingVosId, ...context }
    );
  }
}
