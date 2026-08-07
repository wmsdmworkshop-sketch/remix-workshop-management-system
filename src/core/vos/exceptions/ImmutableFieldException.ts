/**
 * DWIP Enterprise WOS - ImmutableFieldException
 */

import { VosDomainException } from './VosDomainException';

export class ImmutableFieldException extends VosDomainException {
  constructor(fieldNames: string[], context?: Record<string, any>) {
    super(
      `Attempted to modify immutable intake snapshot field(s): ${fieldNames.join(', ')}`,
      'IMMUTABLE_FIELD_REJECTED',
      { fieldNames, ...context }
    );
  }
}
